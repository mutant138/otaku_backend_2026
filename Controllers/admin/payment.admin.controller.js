import dbCommonQuery from "../../utils/dbCommonQuery.js";

/**
 * Get All Payments with Pagination & Filters
 * GET /api/admin/payments
 */
export const getAllPayments = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { status, q } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { razorpay_payment_id: regex },
        { razorpay_order_id: regex },
        { planId: regex },
      ];
    }

    const [payments, total] = await Promise.all([
      dbCommonQuery({
        model: "Payment",
        action: "find",
        filter,
        populate: { path: "user", select: "fullname username email avatar" },
        sort: { createdAt: -1 },
        skip,
        limit,
        lean: true,
      }),
      dbCommonQuery({
        model: "Payment",
        action: "countDocuments",
        filter,
      }),
    ]);

    return res.status(200).json({
      status: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Get All Payments Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch payments." });
  }
};

/**
 * Get Payment By ID
 * GET /api/admin/payments/:id
 */
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await dbCommonQuery({
      model: "Payment",
      action: "findById",
      filter: id,
      populate: { path: "user", select: "fullname username email avatar location" },
      lean: true,
    });

    if (!payment) {
      return res.status(404).json({ status: false, message: "Payment not found." });
    }

    return res.status(200).json({ status: true, data: payment });
  } catch (error) {
    console.error("Get Payment By ID Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch payment details." });
  }
};

/**
 * Update Payment Status
 * PUT /api/admin/payments/:id/status
 */
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["created", "verified", "failed"].includes(status)) {
      return res.status(400).json({ status: false, message: "Invalid status value." });
    }

    const updated = await dbCommonQuery({
      model: "Payment",
      action: "findByIdAndUpdate",
      filter: id,
      data: { status },
      populate: { path: "user", select: "fullname username email" },
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Payment not found." });
    }

    return res.status(200).json({ status: true, message: "Payment status updated.", data: updated });
  } catch (error) {
    console.error("Update Payment Status Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update payment status." });
  }
};
