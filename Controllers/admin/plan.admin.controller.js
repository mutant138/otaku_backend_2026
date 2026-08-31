import dbCommonQuery from "../../utils/dbCommonQuery.js";

/**
 * Get All Plans
 * GET /api/admin/plans
 */
export const getAllPlans = async (req, res) => {
  try {
    const plans = await dbCommonQuery({
      model: "Plan",
      action: "find",
      filter: {},
      sort: { price: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, data: plans });
  } catch (error) {
    console.error("Get All Plans Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch plans." });
  }
};

/**
 * Get Plan by ID
 * GET /api/admin/plans/:id
 */
export const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await dbCommonQuery({
      model: "Plan",
      action: "findById",
      filter: id,
      lean: true,
    });

    if (!plan) {
      return res.status(404).json({ status: false, message: "Plan not found." });
    }

    return res.status(200).json({ status: true, data: plan });
  } catch (error) {
    console.error("Get Plan By ID Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch plan." });
  }
};

/**
 * Create New Plan
 * POST /api/admin/plans
 */
export const createPlan = async (req, res) => {
  try {
    const {
      planId,
      name,
      price,
      originalPrice,
      description = "",
      type = "refill",
      durationDays = 0,
      benefits = [],
      complimentsRefill = 0,
      isPremium = false,
    } = req.body;

    if (!planId || !name || price === undefined || originalPrice === undefined) {
      return res.status(400).json({
        status: false,
        message: "planId, name, price, and originalPrice are required.",
      });
    }

    const existing = await dbCommonQuery({
      model: "Plan",
      action: "findOne",
      filter: { planId: planId.trim() },
      lean: true,
    });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: `Plan with planId '${planId}' already exists.`,
      });
    }

    const newPlan = await dbCommonQuery({
      model: "Plan",
      action: "create",
      data: {
        planId: planId.trim(),
        name: name.trim(),
        price: Number(price),
        originalPrice: Number(originalPrice),
        description: description.trim(),
        type,
        durationDays: Number(durationDays) || 0,
        benefits: Array.isArray(benefits) ? benefits : [],
        complimentsRefill: Number(complimentsRefill) || 0,
        isPremium: Boolean(isPremium),
      },
    });

    return res.status(201).json({ status: true, message: "Plan created successfully.", data: newPlan });
  } catch (error) {
    console.error("Create Plan Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create plan." });
  }
};

/**
 * Update Plan
 * PUT /api/admin/plans/:id
 */
export const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      planId,
      name,
      price,
      originalPrice,
      description,
      type,
      durationDays,
      benefits,
      complimentsRefill,
      isPremium,
    } = req.body;

    const updateData = {};
    if (planId) updateData.planId = planId.trim();
    if (name) updateData.name = name.trim();
    if (price !== undefined) updateData.price = Number(price);
    if (originalPrice !== undefined) updateData.originalPrice = Number(originalPrice);
    if (description !== undefined) updateData.description = description.trim();
    if (type) updateData.type = type;
    if (durationDays !== undefined) updateData.durationDays = Number(durationDays);
    if (benefits !== undefined) updateData.benefits = benefits;
    if (complimentsRefill !== undefined) updateData.complimentsRefill = Number(complimentsRefill);
    if (isPremium !== undefined) updateData.isPremium = Boolean(isPremium);

    const updated = await dbCommonQuery({
      model: "Plan",
      action: "findByIdAndUpdate",
      filter: id,
      data: updateData,
      lean: true,
    });

    if (!updated) {
      return res.status(404).json({ status: false, message: "Plan not found." });
    }

    return res.status(200).json({ status: true, message: "Plan updated successfully.", data: updated });
  } catch (error) {
    console.error("Update Plan Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update plan." });
  }
};

/**
 * Delete Plan
 * DELETE /api/admin/plans/:id
 */
export const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "Plan",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Plan not found." });
    }

    return res.status(200).json({ status: true, message: "Plan deleted successfully." });
  } catch (error) {
    console.error("Delete Plan Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete plan." });
  }
};
