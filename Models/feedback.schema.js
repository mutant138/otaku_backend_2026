import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    tag: {
      type: String,
      enum: ["feature", "bug", "ux", "content", "general", "other"],
      default: "general",
    },
    feedback: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "archived"],
      default: "pending",
    },
    adminNotes: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      default: "OtakuDuo Web",
    },
  },
  {
    timestamps: true,
  }
);

feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ tag: 1, createdAt: -1 });
feedbackSchema.index({ email: 1 });

const Feedback = mongoose.model("Feedback", feedbackSchema);
export default Feedback;
