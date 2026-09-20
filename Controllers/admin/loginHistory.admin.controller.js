import dbCommonQuery from "../../utils/dbCommonQuery.js";
import LoginHistory from "../../Models/loginHistory.schema.js";

/**
 * Get All Login Histories with Filters, Search & Pagination
 * GET /api/admin/login-history
 */
export const getLoginHistories = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const {
      q,
      status,
      loginMethod,
      deviceType,
      userId,
      startDate,
      endDate,
    } = req.query;

    const filter = {};

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { email: regex },
        { username: regex },
        { userIdentifier: regex },
        { ipAddress: regex },
        { browser: regex },
        { os: regex },
      ];
    }

    if (status && status !== "all") {
      filter.status = status.toUpperCase();
    }

    if (loginMethod && loginMethod !== "all") {
      filter.loginMethod = loginMethod.toLowerCase();
    }

    if (deviceType && deviceType !== "all") {
      filter.deviceType = deviceType.toLowerCase();
    }

    if (userId) {
      filter.userId = userId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [logs, total] = await Promise.all([
      LoginHistory.find(filter)
        .populate("userId", "fullname username email avatar role isPremium userId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LoginHistory.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Get Login Histories Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch login history logs.",
    });
  }
};

/**
 * Get Login History Analytics & Stats
 * GET /api/admin/login-history/stats
 */
export const getLoginHistoryStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalLogins,
      todayLogins,
      todayUniqueUsers,
      totalFailedLogins,
      methodBreakdown,
      deviceBreakdown,
      recentActivity,
    ] = await Promise.all([
      LoginHistory.countDocuments(),
      LoginHistory.countDocuments({ createdAt: { $gte: startOfToday } }),
      LoginHistory.distinct("userId", {
        createdAt: { $gte: startOfToday },
        userId: { $ne: null },
      }).then((users) => users.length),
      LoginHistory.countDocuments({ status: "FAILED" }),
      LoginHistory.aggregate([
        { $group: { _id: "$loginMethod", count: { $sum: 1 } } },
      ]),
      LoginHistory.aggregate([
        { $group: { _id: "$deviceType", count: { $sum: 1 } } },
      ]),
      LoginHistory.find()
        .populate("userId", "fullname username email avatar")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const methodsMap = {};
    methodBreakdown.forEach((item) => {
      methodsMap[item._id || "other"] = item.count;
    });

    const devicesMap = {};
    deviceBreakdown.forEach((item) => {
      devicesMap[item._id || "unknown"] = item.count;
    });

    return res.status(200).json({
      status: true,
      data: {
        totalLogins,
        todayLogins,
        todayUniqueUsers,
        totalFailedLogins,
        successRate:
          totalLogins > 0
            ? Math.round(((totalLogins - totalFailedLogins) / totalLogins) * 100)
            : 100,
        methods: methodsMap,
        devices: devicesMap,
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Get Login History Stats Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch login history statistics.",
    });
  }
};

/**
 * Get Specific User's Login History
 * GET /api/admin/login-history/user/:userId
 */
export const getUserLoginHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 10);

    const logs = await LoginHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({
      status: true,
      data: logs,
    });
  } catch (error) {
    console.error("Get User Login History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch user login history.",
    });
  }
};

/**
 * Delete a Single Login History Record
 * DELETE /api/admin/login-history/:id
 */
export const deleteLoginHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await LoginHistory.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: "Login record not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Login history record deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Login History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to delete login history record.",
    });
  }
};

/**
 * Clear Older Login Records (Prune)
 * POST /api/admin/login-history/clear-older
 */
export const clearOlderLoginHistories = async (req, res) => {
  try {
    const days = Math.max(7, parseInt(req.body.days, 10) || 30);
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await LoginHistory.deleteMany({
      createdAt: { $lt: cutoffDate },
    });

    return res.status(200).json({
      status: true,
      message: `Cleaned up ${result.deletedCount} login records older than ${days} days.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Clear Older Login History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to clean up old login records.",
    });
  }
};
