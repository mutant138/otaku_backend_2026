import dbCommonQuery from "../utils/dbCommonQuery.js";
import { buildPublicUserResponse } from "../utils/userHelper.js";

/**
 * Scan & discover candidates for player matches.
 * Route: GET /api/user/candidates
 */
export const getCandidates = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const [permanentExcludes, recentPasses, reportedByMe, reportedMe] = await Promise.all([
      dbCommonQuery({
        model: "Swipe",
        action: "distinct",
        field: "swipee",
        filter: { swiper: currentUserId, swipeType: { $in: ["like", "super"] } },
      }),
      dbCommonQuery({
        model: "Swipe",
        action: "distinct",
        field: "swipee",
        filter: { swiper: currentUserId, swipeType: "pass", createdAt: { $gte: threeDaysAgo } },
      }),
      dbCommonQuery({
        model: "Report",
        action: "distinct",
        field: "reportedUser",
        filter: { reporter: currentUserId },
      }),
      dbCommonQuery({
        model: "Report",
        action: "distinct",
        field: "reporter",
        filter: { reportedUser: currentUserId },
      }),
    ]);

    const excludedUserIds = [...new Set([...permanentExcludes, ...recentPasses, ...reportedByMe, ...reportedMe])];

    const userPath = req.user.preferences?.path || "both";
    const query = {
      _id: { $ne: currentUserId, $nin: excludedUserIds },
      isOnboarded: true,
    };

    if (userPath === "anime") {
      query["preferences.path"] = { $in: ["anime", "both"] };
    } else if (userPath === "game") {
      query["preferences.path"] = { $in: ["game", "both"] };
    }

    const users = await dbCommonQuery({
      model: "User",
      action: "find",
      filter: query,
      projection:
        "username avatar profilePics isVerified fullname gender age location bio preferences height weight education drinking smoking lookingFor kids politics isPremium activeSubscription userId",
      limit: 40,
      lean: true,
    });

    const hasSubscription =
      req.user.activeSubscription &&
      req.user.activeSubscription.expiresAt &&
      new Date(req.user.activeSubscription.expiresAt) > new Date();

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todaySwipesCount = await dbCommonQuery({
      model: "Swipe",
      action: "countDocuments",
      filter: {
        swiper: currentUserId,
        createdAt: { $gte: startOfDay },
      },
    });

    const swipesLeft = hasSubscription ? 9999 : Math.max(0, 5 - todaySwipesCount) + (req.user.extraSwipesBalance || 0);
    const resetTime = new Date();
    resetTime.setUTCHours(24, 0, 0, 0);

    const candidates = users.map((user) => buildPublicUserResponse(user));
    return res.status(200).json({
      status: true,
      candidates,
      swipesLeft,
      resetTime,
    });
  } catch (error) {
    console.error("Get Candidates Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Record a swipe (like, pass, super) on a target user.
 * Route: POST /api/user/swipe
 */
export const swipeUser = async (req, res) => {
  try {
    const swiperId = req.user._id;
    const { swipeeId, swipeType, compliment } = req.body;

    if (!swipeeId || !swipeType) {
      return res.status(400).json({ status: false, message: "Swipee ID and swipe type are required" });
    }

    if (!["like", "pass", "super"].includes(swipeType)) {
      return res.status(400).json({ status: false, message: "Invalid swipe type" });
    }

    const swipee = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: swipeeId,
      lean: true,
    });

    if (!swipee) {
      return res.status(404).json({ status: false, message: "Target user not found" });
    }

    if (compliment && compliment.trim()) {
      const isPremium = req.user.isPremium || false;
      const balance = req.user.complimentsBalance !== undefined ? req.user.complimentsBalance : 1;

      if (!isPremium && balance <= 0) {
        return res.status(403).json({
          status: false,
          needsSubscription: true,
          message:
            "You have depleted your free compliment! A subscription or paid refill is required to transmit more compliments.",
        });
      }
    }

    const existingSwipe = await dbCommonQuery({
      model: "Swipe",
      action: "findOne",
      filter: { swiper: swiperId, swipee: swipeeId },
      lean: false,
    });

    if (existingSwipe) {
      if (existingSwipe.swipeType === "pass") {
        existingSwipe.swipeType = swipeType;
        existingSwipe.createdAt = new Date();
      } else {
        return res.status(400).json({ status: false, message: "You have already swiped on this user" });
      }
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: swiperId,
      lean: false,
    });

    const hasSubscription =
      user.activeSubscription &&
      user.activeSubscription.expiresAt &&
      new Date(user.activeSubscription.expiresAt) > new Date();
    let userModified = false;

    if (swipeType === "super") {
      if (!hasSubscription) {
        const superBalance = user.superLikesBalance !== undefined ? user.superLikesBalance : 1;
        if (superBalance <= 0) {
          return res.status(403).json({
            status: false,
            needsRefill: true,
            message: "Super Likes depleted! Please purchase a plan or refill to get more.",
          });
        }
        user.superLikesBalance = Math.max(0, superBalance - 1);
        userModified = true;
      }
    }

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todaySwipesCount = await dbCommonQuery({
      model: "Swipe",
      action: "countDocuments",
      filter: {
        swiper: swiperId,
        createdAt: { $gte: startOfDay },
      },
    });

    const resetTime = new Date();
    resetTime.setUTCHours(24, 0, 0, 0);

    const isLimitExceeded = todaySwipesCount >= 5 && (user.extraSwipesBalance || 0) <= 0;

    if (!hasSubscription && isLimitExceeded) {
      return res.status(403).json({
        status: false,
        limitReached: true,
        message:
          "Radar calibration energy depleted! Daily swipe limit reached. Please wait for the next radar refresh or purchase a refill.",
        resetTime,
        swipesLeft: 0,
      });
    }

    if (existingSwipe) {
      await existingSwipe.save();
    } else {
      await dbCommonQuery({
        model: "Swipe",
        action: "create",
        data: {
          swiper: swiperId,
          swipee: swipeeId,
          swipeType,
        },
      });
    }

    if (swipee.isBot && ["like", "super"].includes(swipeType)) {
      const botSwipeExists = await dbCommonQuery({
        model: "Swipe",
        action: "findOne",
        filter: { swiper: swipeeId, swipee: swiperId },
        lean: true,
      });

      if (!botSwipeExists) {
        await dbCommonQuery({
          model: "Swipe",
          action: "create",
          data: {
            swiper: swipeeId,
            swipee: swiperId,
            swipeType: "like",
          },
        });
      }

      const welcomeMsgExists = await dbCommonQuery({
        model: "Message",
        action: "findOne",
        filter: { sender: swipeeId, receiver: swiperId },
        lean: true,
      });

      if (!welcomeMsgExists) {
        await dbCommonQuery({
          model: "Message",
          action: "create",
          data: {
            sender: swipeeId,
            receiver: swiperId,
            content:
              "Hi! Welcome to OtakuDuo. I'm Jarvis, your system guide. I can help you calibrate your credentials, search for other players, or just keep you company. What anime or game are you currently hyperfocused on?",
            isRead: false,
          },
        });
      }
    }

    if (!hasSubscription && todaySwipesCount >= 5) {
      user.extraSwipesBalance = Math.max(0, (user.extraSwipesBalance || 0) - 1);
      userModified = true;
    }

    if (compliment && compliment.trim()) {
      await dbCommonQuery({
        model: "Message",
        action: "create",
        data: {
          sender: swiperId,
          receiver: swipeeId,
          content: compliment.trim(),
          isRead: false,
        },
      });

      if (!user.isPremium) {
        user.complimentsBalance = Math.max(0, (user.complimentsBalance || 1) - 1);
        userModified = true;
      }
    }

    if (userModified) {
      await user.save();
    }

    const newSwipesLeft = hasSubscription ? 9999 : Math.max(0, 5 - (todaySwipesCount + 1)) + (user.extraSwipesBalance || 0);

    return res.status(201).json({
      status: true,
      message: "Swipe recorded successfully",
      swipesLeft: newSwipesLeft,
      resetTime,
      complimentsBalance: user.complimentsBalance !== undefined ? user.complimentsBalance : 1,
    });
  } catch (error) {
    console.error("Swipe User Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Report a user for misconduct.
 * Route: POST /api/user/report
 */
export const reportUser = async (req, res) => {
  try {
    const reporter = req.user._id;
    const { reportedUserId, reason, details } = req.body;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ status: false, message: "Reported user ID and reason are required" });
    }

    const existingReport = await dbCommonQuery({
      model: "Report",
      action: "findOne",
      filter: { reporter, reportedUser: reportedUserId },
      lean: true,
    });

    if (existingReport) {
      return res.status(400).json({ status: false, message: "You have already reported this user" });
    }

    await dbCommonQuery({
      model: "Report",
      action: "create",
      data: {
        reporter,
        reportedUser: reportedUserId,
        reason,
        details,
      },
    });

    return res.status(201).json({ status: true, message: "User reported successfully" });
  } catch (error) {
    console.error("Report User Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Fetch profiles of users who liked/super-liked current user.
 * Route: GET /api/user/lobby/likes
 */
export const getLobbyLikes = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const swipedUserIds = await dbCommonQuery({
      model: "Swipe",
      action: "distinct",
      field: "swipee",
      filter: { swiper: currentUserId },
    });

    const likedSwipes = await dbCommonQuery({
      model: "Swipe",
      action: "find",
      filter: {
        swipee: currentUserId,
        swiper: { $nin: swipedUserIds },
        swipeType: { $in: ["like", "super"] },
      },
      populate: "swiper",
      lean: true,
    });

    const likes = likedSwipes
      .map((s) => {
        const userRes = buildPublicUserResponse(s.swiper);
        if (userRes) {
          userRes.swipeType = s.swipeType;
          userRes.compliment = s.compliment || "";
        }
        return userRes;
      })
      .filter(Boolean);

    return res.status(200).json({ status: true, likes });
  } catch (error) {
    console.error("Get Lobby Likes Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
