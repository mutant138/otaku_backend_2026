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
 * Get Global Duel Leaderboard (Top PvP champions ranked by account Synergy)
 */
export async function getDuelLeaderboard(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = {
      isBot: { $ne: true },
      username: { $exists: true, $ne: "" },
    };

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit) || 1;

    // Fetch top users sorted by synergy descending, then createdAt ascending
    const users = await User.find(filter)
      .select("username profilePics avatar synergy activeSubscription createdAt")
      .sort({ synergy: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Collect user IDs to lookup duel wins in batch
    const userIds = users.map((u) => u._id);

    const winCounts = await DuelHistory.aggregate([
      {
        $match: {
          winner: { $in: userIds },
        },
      },
      {
        $group: {
          _id: "$winner",
          wins: { $sum: 1 },
          totalScore: { $sum: { $max: ["$player1Score", "$player2Score"] } },
        },
      },
    ]);

    const winMap = new Map();
    for (const w of winCounts) {
      winMap.set(w._id.toString(), { wins: w.wins, totalScore: w.totalScore });
    }

    const leaderboard = users.map((u, idx) => {
      const stats = winMap.get(u._id.toString()) || { wins: 0, totalScore: 0 };
      const hasPass =
        u.activeSubscription?.expiresAt &&
        new Date(u.activeSubscription.expiresAt) > new Date();

      return {
        _id: u._id,
        rank: skip + idx + 1,
        username: u.username || "Player",
        avatar: u.profilePics?.[0] || u.avatar || "",
        synergy: u.synergy || 0,
        wins: stats.wins,
        totalScore: stats.totalScore,
        hasPass: !!hasPass,
      };
    });

    return res.status(200).json({
      status: true,
      leaderboard,
      pagination: {
        page,
        limit,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    return res.status(500).json({ status: false, message: "Failed to fetch leaderboard." });
  }
}

