import mongoose from "mongoose";

const duelHistorySchema = new mongoose.Schema(
  {
    player1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    player2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isDraw: {
      type: Boolean,
      default: false,
    },
    player1Score: {
      type: Number,
      default: 0,
    },
    player2Score: {
      type: Number,
      default: 0,
    },
    totalRounds: {
      type: Number,
      default: 5,
    },
    categoryBreakdown: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

duelHistorySchema.index({ player1: 1, createdAt: -1 });
duelHistorySchema.index({ player2: 1, createdAt: -1 });

const DuelHistory = mongoose.model("DuelHistory", duelHistorySchema);
export default DuelHistory;
