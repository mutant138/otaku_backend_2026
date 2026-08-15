import crypto from "crypto";
import Razorpay from "razorpay";
import dbCommonQuery from "../utils/dbCommonQuery.js";
import { buildUserResponse } from "../utils/userHelper.js";

export const DEFAULT_PLANS = [
  {
    planId: "mana-drop",
    name: "Mana Drop",
    price: 49,
    originalPrice: 99,
    description: "Quick refill for active explorers.",
    type: "refill",
    durationDays: 0,
    benefits: [
      { text: "15 Extra Swipes", iconName: "FaGamepad" },
      { text: "2 Compliments", iconName: "FaStar" },
      { text: "1 Super Like", iconName: "FaFire" },
    ],
    complimentsRefill: 2,
    isPremium: false,
  },
  {
    planId: "power-surge",
    name: "Power Surge",
    price: 99,
    originalPrice: 199,
    description: "Unleash your energy for 24 hours.",
    type: "subscription",
    durationDays: 1,
    benefits: [
      { text: "Unlimited Swipes for 24 Hours", iconName: "FaBolt" },
      { text: "4 Direct Messages", iconName: "FaRocket" },
      { text: "3 Super Likes", iconName: "FaStar" },
    ],
    complimentsRefill: 4,
    isPremium: false,
  },
  {
    planId: "otaku-pass",
    name: "Otaku Pass",
    price: 143,
    originalPrice: 299,
    description: "Unlock your full anime and gaming potential. (Weekly Reset)",
    type: "subscription",
    durationDays: 7,
    benefits: [
      { text: "Unlimited Swipes", iconName: "FaBolt" },
      { text: "Spotlight Profile", iconName: "FaStar" },
      { text: "10 Messages per Week", iconName: "FaRocket" },
      { text: "5 Super Likes per Week", iconName: "FaFire" },
    ],
    complimentsRefill: 10,
    isPremium: true,
  },
];

/**
 * Get available plans.
 * Route: GET /api/user/plans
 */
export const getPlans = async (req, res) => {
  try {
    let plans = await dbCommonQuery({
      model: "Plan",
      action: "find",
      filter: {},
      lean: true,
    });
    if (plans.length === 0) {
      plans = await dbCommonQuery({
        model: "Plan",
        action: "create",
        data: DEFAULT_PLANS,
      });
    }
    return res.status(200).json({ status: true, plans });
  } catch (error) {
    console.error("Get Plans Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Create Razorpay order.
 * Route: POST /api/user/create-order
 */
export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ status: false, message: "Plan ID is required" });
    }

    let plan = await dbCommonQuery({
      model: "Plan",
      action: "findOne",
      filter: { planId },
      lean: true,
    });

    if (!plan) {
      const count = await dbCommonQuery({
        model: "Plan",
        action: "countDocuments",
        filter: {},
      });
      if (count === 0) {
        await dbCommonQuery({
          model: "Plan",
          action: "create",
          data: DEFAULT_PLANS,
        });
        plan = await dbCommonQuery({
          model: "Plan",
          action: "findOne",
          filter: { planId },
          lean: true,
        });
      }
    }

    if (!plan) {
      return res.status(404).json({ status: false, message: "Subscription plan not found" });
    }

    const amount = plan.price * 100;
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).json({ status: false, message: "Failed to create Razorpay order" });
    }

    return res.status(201).json({
      status: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      planId,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Verify Razorpay payment signature & apply user benefits.
 * Route: POST /api/user/verify-payment
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      return res.status(400).json({ status: false, message: "All payment credentials are required" });
    }

    const plan = await dbCommonQuery({
      model: "Plan",
      action: "findOne",
      filter: { planId },
      lean: true,
    });

    if (!plan) {
      return res.status(404).json({ status: false, message: "Plan not found" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const signatureBuffer = Buffer.from(razorpay_signature, "hex");

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return res.status(400).json({ status: false, message: "Transaction verification failed. Signature mismatch." });
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: req.user._id,
      lean: false,
    });

    const isGirl = user.gender && ["female", "girl", "woman"].includes(user.gender.toLowerCase().trim());
    const multiplier = isGirl ? 2 : 1;

    const complimentsAdded = plan.complimentsRefill * multiplier;
    user.complimentsBalance = (user.complimentsBalance !== undefined ? user.complimentsBalance : 1) + complimentsAdded;

    let extraSwipesAdded = 0;
    if (plan.planId === "mana-drop") {
      extraSwipesAdded = 15 * multiplier;
      user.extraSwipesBalance = (user.extraSwipesBalance || 0) + extraSwipesAdded;
    }

    let superLikesAdded = 0;
    if (plan.planId === "mana-drop") {
      superLikesAdded = 1 * multiplier;
    } else if (plan.planId === "power-surge") {
      superLikesAdded = 3 * multiplier;
    } else if (plan.planId === "otaku-pass") {
      superLikesAdded = 5 * multiplier;
    }
    user.superLikesBalance = (user.superLikesBalance !== undefined ? user.superLikesBalance : 1) + superLikesAdded;

    if (plan.isPremium) {
      user.isPremium = true;
    }

    if (plan.type === "subscription" && plan.durationDays > 0) {
      const purchasedAt = new Date();
      const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      user.activeSubscription = {
        plan: plan._id,
        planId: plan.planId,
        purchasedAt,
        expiresAt,
      };
    }

    await user.save();

    await dbCommonQuery({
      model: "Payment",
      action: "create",
      data: {
        user: user._id,
        planId,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        amount: plan.price * 100,
        status: "verified",
      },
    });

    return res.status(200).json({
      status: true,
      message: "Payment successfully verified and benefits applied!",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Redeem plan using Synergy Points.
 * Route: POST /api/user/redeem-plan
 */
export const redeemPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ status: false, message: "Plan ID is required" });
    }

    if (!["mana-drop", "power-surge"].includes(planId)) {
      return res.status(400).json({
        status: false,
        message: "Only Mana Drop and Power Surge are redeemable via Synergy points",
      });
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: req.user._id,
      lean: false,
    });

    const requiredSynergy = planId === "mana-drop" ? 5000 : 10000;

    if ((user.synergy || 0) < requiredSynergy) {
      return res.status(400).json({
        status: false,
        message: `Insufficient Quantum Synergy! You need ${requiredSynergy} points, but currently have ${user.synergy || 0}.`,
      });
    }

    const plan = await dbCommonQuery({
      model: "Plan",
      action: "findOne",
      filter: { planId },
      lean: true,
    });

    if (!plan) {
      return res.status(404).json({ status: false, message: "Plan not found" });
    }

    user.synergy = Math.max(0, (user.synergy || 0) - requiredSynergy);

    const isGirl = user.gender && ["female", "girl", "woman"].includes(user.gender.toLowerCase().trim());
    const multiplier = isGirl ? 2 : 1;

    const complimentsAdded = plan.complimentsRefill * multiplier;
    user.complimentsBalance = (user.complimentsBalance !== undefined ? user.complimentsBalance : 1) + complimentsAdded;

    let extraSwipesAdded = 0;
    if (plan.planId === "mana-drop") {
      extraSwipesAdded = 15 * multiplier;
      user.extraSwipesBalance = (user.extraSwipesBalance || 0) + extraSwipesAdded;
    }

    let superLikesAdded = 0;
    if (plan.planId === "mana-drop") {
      superLikesAdded = 1 * multiplier;
    } else if (plan.planId === "power-surge") {
      superLikesAdded = 3 * multiplier;
    }
    user.superLikesBalance = (user.superLikesBalance !== undefined ? user.superLikesBalance : 1) + superLikesAdded;

    if (plan.isPremium) {
      user.isPremium = true;
    }

    if (plan.type === "subscription" && plan.durationDays > 0) {
      const purchasedAt = new Date();
      const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      user.activeSubscription = {
        plan: plan._id,
        planId: plan.planId,
        purchasedAt,
        expiresAt,
      };
    }

    await user.save();

    await dbCommonQuery({
      model: "Payment",
      action: "create",
      data: {
        user: user._id,
        planId,
        razorpay_payment_id: `synergy_redeem_${Date.now()}`,
        razorpay_order_id: `synergy_order_${Date.now()}`,
        razorpay_signature: "synergy_redeemed",
        amount: 0,
        status: "verified",
      },
    });

    return res.status(200).json({
      status: true,
      message: `Plan successfully redeemed using ${requiredSynergy} Synergy points!`,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Redeem Plan Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
