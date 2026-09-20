import dbCommonQuery from "../../utils/dbCommonQuery.js";

/**
 * Get All Feedbacks with filtering, search, and pagination
 * GET /api/admin/feedbacks
 */
export const getAllFeedbacks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, tag, search } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (tag && tag !== "all") {
      filter.tag = tag;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { feedback: searchRegex },
        { adminNotes: searchRegex },
      ];
    }

    const [feedbacks, total] = await Promise.all([
      dbCommonQuery({
        model: "Feedback",
        action: "find",
        filter,
        populate: [{ path: "user", select: "fullname username email avatar userId isVerified isPremium" }],
        sort: { createdAt: -1 },
        skip,
        limit,
        lean: true,
      }),
      dbCommonQuery({
        model: "Feedback",
        action: "countDocuments",
        filter,
      }),
    ]);

    return res.status(200).json({
      status: true,
      data: {
        feedbacks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Get All Feedbacks Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch feedbacks." });
  }
};

/**
 * Get Feedback Metrics & Analytics Stats
 * GET /api/admin/feedbacks/stats
 */
export const getFeedbackStats = async (req, res) => {
  try {
    const [total, pending, reviewed, resolved, bugs, features] = await Promise.all([
      dbCommonQuery({ model: "Feedback", action: "countDocuments", filter: {} }),
      dbCommonQuery({ model: "Feedback", action: "countDocuments", filter: { status: "pending" } }),
      dbCommonQuery({ model: "Feedback", action: "countDocuments", filter: { status: "reviewed" } }),
      dbCommonQuery({ model: "Feedback", action: "countDocuments", filter: { status: "resolved" } }),
      dbCommonQuery({ model: "Feedback", action: "countDocuments", filter: { tag: "bug" } }),
      dbCommonQuery({ model: "Feedback", action: "countDocuments", filter: { tag: "feature" } }),
    ]);

    return res.status(200).json({
      status: true,
      data: {
        total,
        pending,
        reviewed,
        resolved,
        bugs,
        features,
      },
    });
  } catch (error) {
    console.error("Get Feedback Stats Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch feedback statistics." });
  }
};

/**
 * Update Feedback Status & Admin Notes
 * PATCH /api/admin/feedbacks/:id
 */
export const updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const updateData = {};
    if (status && ["pending", "reviewed", "resolved", "archived"].includes(status)) {
      updateData.status = status;
    }
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes.trim();
    }

    const updated = await dbCommonQuery({
      model: "Feedback",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      options: { new: true },
      populate: [{ path: "user", select: "fullname username email avatar userId" }],
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Feedback not found." });
    }

    return res.status(200).json({
      status: true,
      message: "Feedback updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Update Feedback Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update feedback." });
  }
};

/**
 * Delete / Dismiss Feedback
 * DELETE /api/admin/feedbacks/:id
 */
export const deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "Feedback",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Feedback not found." });
    }

    return res.status(200).json({
      status: true,
      message: "Feedback deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Feedback Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete feedback." });
  }
};
