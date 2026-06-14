import mongoose from "mongoose";

const swipeSchema = new mongoose.Schema({
  swiper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  swipee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  swipeType: {
    type: String,
    enum: ["like", "pass", "super"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true
});

// Compound unique index so a user can only swipe once per candidate user
swipeSchema.index({ swiper: 1, swipee: 1 }, { unique: true });
// Index for querying daily swipes efficiently
swipeSchema.index({ swiper: 1, createdAt: -1 });

const Swipe = mongoose.model("Swipe", swipeSchema);
export default Swipe;
