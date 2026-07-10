import express from "express";
import userController from "../Controllers/user.controller.js";
import * as authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import { validate } from "../middleware/validation.middleware.js";
import {
  checkEmailSchema,
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  oauthSchema,
  onboardSchema,
  updateProfileSchema,
  deletePhotoSchema,
  swipeUserSchema,
  createOrderSchema,
  verifyPaymentSchema,
  redeemPlanSchema,
  sendChatMessageSchema,
} from "../validations/user.validation.js";

const router = express.Router();

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
router.get("/me", authMiddleware.protect, userController.getMe);
router.put("/update-profile", authMiddleware.protect, authMiddleware.requireOnboarded, validate(updateProfileSchema), userController.updateProfile);
router.post("/upload-avatar", authMiddleware.protect, upload.single("avatar"), userController.uploadAvatar);
router.post("/upload-photo", authMiddleware.protect, upload.single("photo"), userController.uploadPhoto);
router.delete("/delete-photo", authMiddleware.protect, validate(deletePhotoSchema), userController.deletePhoto);
router.get("/candidates", authMiddleware.protect, authMiddleware.requireOnboarded, userController.getCandidates);
router.post("/swipe", authMiddleware.protect, authMiddleware.requireOnboarded, validate(swipeUserSchema), userController.swipeUser);
router.post("/report", authMiddleware.protect, authMiddleware.requireOnboarded, userController.reportUser);
router.post("/create-order", authMiddleware.protect, validate(createOrderSchema), userController.createOrder);
router.post("/verify-payment", authMiddleware.protect, validate(verifyPaymentSchema), userController.verifyPayment);
router.post("/redeem-plan", authMiddleware.protect, validate(redeemPlanSchema), userController.redeemPlan);
router.get("/plans", authMiddleware.protect, userController.getPlans);
router.get("/lobby/likes", authMiddleware.protect, authMiddleware.requireOnboarded, userController.getLobbyLikes);
router.get("/profile/:id", authMiddleware.protect, authMiddleware.requireOnboarded, userController.getUserProfile);
router.get("/lobby/chats", authMiddleware.protect, authMiddleware.requireOnboarded, userController.getLobbyChats);
router.get("/lobby/messages/:otherUserId", authMiddleware.protect, authMiddleware.requireOnboarded, userController.getChatMessages);
router.post("/lobby/messages", authMiddleware.protect, authMiddleware.requireOnboarded, validate(sendChatMessageSchema), userController.sendChatMessage);

export default router;