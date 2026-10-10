import mongoose from "mongoose";

const gameSettingSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      unique: true, // "trivia_duel" | "word_cipher"
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    tag: {
      type: String,
      default: "",
    },
    isPublic: {
      type: Boolean,
      default: true, // "Show Public" checkbox / toggle
    },
    winReward: {
      type: Number,
      default: 30, // Synergy points on win
      min: 0,
    },
    defeatPenalty: {
      type: Number,
      default: 5, // Synergy points deducted on loss
      min: 0,
    },
    drawReward: {
      type: Number,
      default: 5, // Synergy points on draw (if applicable)
      min: 0,
    },
  },
  { timestamps: true }
);

export const DEFAULT_GAME_SETTINGS = [
  {
    gameId: "trivia_duel",
    title: "Live Anime & Game Showdown",
    tag: "Ranked 1v1 Trivia Duel",
    description: "Enter real-time 1v1 combat. Questions are dynamically calibrated from duelists' anime & game favorites.",
    isPublic: true,
    winReward: 50,
    defeatPenalty: 0,
    drawReward: 5,
  },
  {
    gameId: "word_cipher",
    title: "Secret Word Cipher Duel",
    tag: "Tactical 1v1 Cipher Duel",
    description: "Cipher Master seals a secret word; Cipher Breaker has deduction chances to crack it.",
    isPublic: true,
    winReward: 30,
    defeatPenalty: 5,
    drawReward: 0,
  },
];

const GameSetting = mongoose.model("GameSetting", gameSettingSchema);
export default GameSetting;

