import mongoose from "mongoose";

const loginHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    userIdentifier: {
      type: String,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    username: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
    },
    browser: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    os: {
      type: String,
      trim: true,
      default: "Unknown",
    },
    deviceType: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "bot", "unknown"],
      default: "unknown",
    },
    loginMethod: {
      type: String,
      enum: ["email", "google", "discord", "otp", "admin", "other"],
      default: "email",
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED"],
      default: "SUCCESS",
      index: true,
    },
    failReason: {
      type: String,
      trim: true,
    },
    location: {
      city: { type: String, default: "" },
      region: { type: String, default: "" },
      country: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying
loginHistorySchema.index({ createdAt: -1 });
loginHistorySchema.index({ userId: 1, createdAt: -1 });
loginHistorySchema.index({ status: 1, loginMethod: 1, createdAt: -1 });

const LoginHistory = mongoose.model("LoginHistory", loginHistorySchema);
export default LoginHistory;
