import express from "express";
import {
  getPlayerDuelStats,
  getDuelLeaderboard,
  getPublicGameSettings,
} from "../Controllers/duel.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/game-settings", getPublicGameSettings);
router.get("/stats", protect, getPlayerDuelStats);
router.get("/leaderboard", getDuelLeaderboard);

export default router;

