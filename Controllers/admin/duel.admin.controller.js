import { DuelHistory, User } from "../../Models/index.js";

// ── GET DUELS HISTORY (With Pagination, Search, Filter by Status) ──
export const getAdminDuels = async (req, res) => {
  try {
    const { outcome, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (outcome === "draw") {
      filter.isDraw = true;
    } else if (outcome === "victory") {
      filter.isDraw = false;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [duels, total] = await Promise.all([
      DuelHistory.find(filter)
        .populate("player1", "username email profilePics avatar isBot synergy")
        .populate("player2", "username email profilePics avatar isBot synergy")
        .populate("winner", "username email profilePics avatar isBot synergy")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DuelHistory.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: true,
      data: duels,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("Get Admin Duels Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch duel history." });
  }
};

// ── GET ARENA COMBAT STATS ──
export const getAdminDuelStats = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalMatches, todayMatches, drawMatches, topSynergyUsers] = await Promise.all([
      DuelHistory.countDocuments({}),
      DuelHistory.countDocuments({ createdAt: { $gte: startOfToday } }),
      DuelHistory.countDocuments({ isDraw: true }),
      User.find({ isBot: { $ne: true } })
        .sort({ synergy: -1 })
        .limit(5)
        .select("username email profilePics synergy")
        .lean(),
    ]);

    const victoryMatches = totalMatches - drawMatches;

    return res.status(200).json({
      status: true,
      data: {
        totalMatches,
        todayMatches,
        victoryMatches,
        drawMatches,
        topSynergyUsers,
      },
    });
  } catch (error) {
    console.error("Get Duel Stats Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch duel stats." });
  }
};

// ── DELETE DUEL LOG ──
export const deleteAdminDuel = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DuelHistory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: false, message: "Duel record not found." });
    }

    return res.status(200).json({ status: true, message: "Duel record deleted successfully." });
  } catch (error) {
    console.error("Delete Duel Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete duel log." });
  }
};
