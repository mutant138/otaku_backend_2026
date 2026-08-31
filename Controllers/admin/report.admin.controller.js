import dbCommonQuery from "../../utils/dbCommonQuery.js";

/**
 * Get All Reports
 * GET /api/admin/reports
 */
export const getAllReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      dbCommonQuery({
        model: "Report",
        action: "find",
        filter: {},
        populate: [
          { path: "reporter", select: "fullname username email avatar userId" },
          { path: "reportedUser", select: "fullname username email avatar userId isVerified isPremium isBot" },
        ],
        sort: { createdAt: -1 },
        skip,
        limit,
        lean: true,
      }),
      dbCommonQuery({
        model: "Report",
        action: "countDocuments",
        filter: {},
      }),
    ]);

    return res.status(200).json({
      status: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Get All Reports Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch reports." });
  }
};

/**
 * Get Report by ID
 * GET /api/admin/reports/:id
 */
export const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await dbCommonQuery({
      model: "Report",
      action: "findById",
      filter: id,
      populate: [
        { path: "reporter", select: "fullname username email avatar userId" },
        { path: "reportedUser", select: "fullname username email avatar userId isVerified isPremium isBot bio" },
      ],
      lean: true,
    });

    if (!report) {
      return res.status(404).json({ status: false, message: "Report not found." });
    }

    return res.status(200).json({ status: true, data: report });
  } catch (error) {
    console.error("Get Report By ID Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch report." });
  }
};

/**
 * Ban / Delete Reported User
 * POST /api/admin/reports/:id/ban-user
 */
export const banReportedUser = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await dbCommonQuery({
      model: "Report",
      action: "findById",
      filter: id,
      lean: true,
    });

    if (!report) {
      return res.status(404).json({ status: false, message: "Report not found." });
    }

    const reportedUserId = report.reportedUser;

    // Delete reported user and their records
    await dbCommonQuery({
      model: "User",
      action: "findByIdAndDelete",
      filter: reportedUserId,
    });

    await Promise.all([
      dbCommonQuery({
        model: "Swipe",
        action: "deleteMany",
        filter: { $or: [{ swiper: reportedUserId }, { target: reportedUserId }] },
      }),
      dbCommonQuery({
        model: "Report",
        action: "deleteMany",
        filter: { reportedUser: reportedUserId },
      }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Reported user banned and removed from system successfully.",
    });
  } catch (error) {
    console.error("Ban Reported User Error:", error);
    return res.status(500).json({ status: false, message: "Failed to action reported user." });
  }
};

/**
 * Dismiss / Delete Report
 * DELETE /api/admin/reports/:id
 */
export const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "Report",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Report not found." });
    }

    return res.status(200).json({ status: true, message: "Report dismissed/deleted." });
  } catch (error) {
    console.error("Delete Report Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete report." });
  }
};
