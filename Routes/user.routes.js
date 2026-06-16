import express from "express";
import userController from "../Controllers/user.controller.js";
import * as authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validation.middleware.js";

const router = express.Router();

// Validation Schemas
const checkEmailSchema = {
  email: { type: "email", required: true },
};

const registerSchema = {
  fullname: { type: "string", required: true },
  email: { type: "email", required: true },
  password: { type: "string", required: true },
};

const verifyOtpSchema = {
  email: { type: "email", required: true },
  otp: { type: "string", required: true },
};

const resendOtpSchema = {
  email: { type: "email", required: true },
};

const loginSchema = {
  email: { type: "email", required: true },
  password: { type: "string", required: true },
};

const forgotPasswordSchema = {
  email: { type: "email", required: true },
};

const resetPasswordSchema = {
  email: { type: "email", required: true },
  otp: { type: "string", required: true },
  newPassword: { type: "string", required: true },
};

const oauthSchema = {
  provider: {
    type: "string",
    required: true,
    enum: ["google", "discord"],
    validate: (value, body) => {
      if (value === "google") {
        if (!body.credential && !body.accessToken) {
          return "Google ID token credential or accessToken is required";
        }
      } else if (value === "discord") {
        if (!body.code) {
          if (!body.email) {
            return "Email or authorization code is required for Discord OAuth";
          }
          if (!body.providerId) {
            return "Provider ID is required for Discord OAuth";
          }
        }
      }
    }
  },
};

const onboardSchema = {
  preferences: {
    type: "object",
    required: true,
    validate: (value) => {
      if (!value.path) {
        return "preferences.path is required";
      }
      if (!["anime", "game", "both"].includes(value.path)) {
        return "preferences.path must be one of: anime, game, both";
      }
    }
  }
};

const updateProfileSchema = {
  email: { type: "email", required: false },
  age: { type: "number", required: false },
  gender: { type: "string", required: false },
  fullname: { type: "string", required: false },
  location: { type: "string", required: false },
  locationDetails: { type: "object", required: false },
  bio: { type: "string", required: false },
  username: { type: "string", required: false },
};

const deletePhotoSchema = {
  photoUrl: { type: "string", required: true },
};

const swipeUserSchema = {
  swipeeId: { type: "string", required: true },
  swipeType: { type: "string", required: true, enum: ["like", "pass", "super"] },
  compliment: { type: "string", required: false },
};

const createOrderSchema = {
  planId: { type: "string", required: true, enum: ["mana-drop", "power-surge", "otaku-pass"] },
};

const verifyPaymentSchema = {
  razorpay_payment_id: { type: "string", required: true },
  razorpay_order_id: { type: "string", required: true },
  razorpay_signature: { type: "string", required: true },
  planId: { type: "string", required: true, enum: ["mana-drop", "power-surge", "otaku-pass"] },
};

const redeemPlanSchema = {
  planId: { type: "string", required: true, enum: ["mana-drop", "power-surge"] },
};

const sendChatMessageSchema = {
  receiverId: { type: "string", required: true },
  content: { type: "string", required: true },
};

// Routes
router.post("/check-email", validate(checkEmailSchema), userController.checkEmail);
router.post("/register", validate(registerSchema), userController.registerUser);
router.post("/verify-otp", validate(verifyOtpSchema), userController.verifyOtp);
router.post("/resend-otp", validate(resendOtpSchema), userController.resendOtp);
router.post("/login", validate(loginSchema), userController.loginUser);
router.post("/forgot-password", validate(forgotPasswordSchema), userController.forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), userController.resetPassword);
router.post("/oauth", validate(oauthSchema), userController.oauthLoginOrSignup);
router.post("/onboard", authMiddleware.protect, validate(onboardSchema), userController.onboardUser);
router.get("/generate-username", authMiddleware.protect, userController.generateUsername);
router.get("/metadata", authMiddleware.protect, userController.getMetadata);
router.put("/update-profile", authMiddleware.protect, validate(updateProfileSchema), userController.updateProfile);
router.post("/upload-avatar", authMiddleware.protect, upload.single("avatar"), userController.uploadAvatar);
router.post("/upload-photo", authMiddleware.protect, upload.single("photo"), userController.uploadPhoto);
router.delete("/delete-photo", authMiddleware.protect, validate(deletePhotoSchema), userController.deletePhoto);
router.get("/candidates", authMiddleware.protect, userController.getCandidates);
router.post("/swipe", authMiddleware.protect, validate(swipeUserSchema), userController.swipeUser);
router.post("/report", authMiddleware.protect, userController.reportUser);
router.post("/create-order", authMiddleware.protect, validate(createOrderSchema), userController.createOrder);
router.post("/verify-payment", authMiddleware.protect, validate(verifyPaymentSchema), userController.verifyPayment);
router.post("/redeem-plan", authMiddleware.protect, validate(redeemPlanSchema), userController.redeemPlan);
router.get("/plans", authMiddleware.protect, userController.getPlans);
router.get("/lobby/likes", authMiddleware.protect, userController.getLobbyLikes);
router.get("/profile/:id", authMiddleware.protect, userController.getUserProfile);
router.get("/lobby/chats", authMiddleware.protect, userController.getLobbyChats);
router.get("/lobby/messages/:otherUserId", authMiddleware.protect, userController.getChatMessages);
router.post("/lobby/messages", authMiddleware.protect, validate(sendChatMessageSchema), userController.sendChatMessage);

export default router;