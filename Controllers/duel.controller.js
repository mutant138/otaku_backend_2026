import DuelHistory from "../Models/duelHistory.schema.js";
import User from "../Models/user.schema.js";

/**
 * Get player duel battle history and win rate statistics
 */
export async function getPlayerDuelStats(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const userDoc = await User.findById(userId)
      .select("synergy username profilePics activeSubscription isPremium")
      .lean();
    const synergy = userDoc?.synergy || 0;

    const hasPass =
      userDoc?.activeSubscription?.expiresAt &&
      new Date(userDoc.activeSubscription.expiresAt) > new Date() &&
      (userDoc.activeSubscription.planId === "otaku-pass" || userDoc.isPremium);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayMatchesCount = await DuelHistory.countDocuments({
      $or: [{ player1: userId }, { player2: userId }],
      createdAt: { $gte: startOfDay },
    });

    const matches = await DuelHistory.find({
      $or: [{ player1: userId }, { player2: userId }],
    })
      .populate("player1", "username profilePics")
      .populate("player2", "username profilePics")
      .populate("winner", "username profilePics")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    let wins = 0;
    let losses = 0;
    let draws = 0;

    for (const m of matches) {
      if (m.isDraw) {
        draws++;
      } else if (
        m.winner &&
        (m.winner._id?.toString() === userId.toString() ||
          m.winner.toString() === userId.toString())
      ) {
        wins++;
      } else {
        losses++;
      }
    }

    const totalMatches = matches.length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    return res.status(200).json({
      status: true,
      stats: {
        totalMatches,
        wins,
        losses,
        draws,
        winRate,
        synergy,
        dailyDuels: {
          played: todayMatchesCount,
          limit: 3,
          remaining: hasPass ? 999999 : Math.max(0, 3 - todayMatchesCount),
          hasPass: !!hasPass,
        },
      },
      matches,
    });

  } catch (err) {
    console.error("Error fetching duel stats:", err);
    return res.status(500).json({ status: false, message: "Failed to fetch duel stats." });
  }
}

/**
 * Get Global Duel Leaderboard (Top PvP champions)
 */
export async function getDuelLeaderboard(req, res) {
  try {
    const leaderboard = await DuelHistory.aggregate([
      { $match: { winner: { $ne: null } } },
      {
        $group: {
          _id: "$winner",
          wins: { $sum: 1 },
          totalScore: { $sum: { $max: ["$player1Score", "$player2Score"] } },
        },
      },
      { $sort: { wins: -1, totalScore: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "player",
        },
      },
      { $unwind: "$player" },
      // Never show bot accounts on the leaderboard, only genuine human players
      {
        $match: {
          "player.isBot": { $ne: true },
        },
      },
      {
        $project: {
          _id: 1,
          wins: 1,
          totalScore: 1,
          synergy: { $ifNull: ["$player.synergy", 0] },
          username: "$player.username",
          avatar: { $arrayElemAt: ["$player.profilePics", 0] },
          hasPass: {
            $cond: [
              { $gt: ["$player.activeSubscription.expiresAt", new Date()] },
              true,
              false,
            ],
          },
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      leaderboard,
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    return res.status(500).json({ status: false, message: "Failed to fetch leaderboard." });
  }
}

