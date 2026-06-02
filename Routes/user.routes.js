import express from "express";
import userController from "../Controllers/user.controller.js";
import * as authMiddleware from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/check-email", userController.checkEmail);
router.post("/register", userController.registerUser);
router.post("/verify-otp", userController.verifyOtp);
router.post("/login", userController.loginUser);
router.post("/oauth", userController.oauthLoginOrSignup);
router.post("/onboard", authMiddleware.protect, userController.onboardUser);
router.get("/generate-username", authMiddleware.protect, userController.generateUsername);
router.get("/metadata", authMiddleware.protect, userController.getMetadata);
router.put("/update-profile", authMiddleware.protect, userController.updateProfile);
router.post("/upload-avatar", authMiddleware.protect, upload.single("avatar"), userController.uploadAvatar);
router.post("/upload-photo", authMiddleware.protect, upload.single("photo"), userController.uploadPhoto);
router.delete("/delete-photo", authMiddleware.protect, userController.deletePhoto);

export default router;