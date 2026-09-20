import express from "express";
import { getPlayerDuelStats, getDuelLeaderboard } from "../Controllers/duel.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/stats", protect, getPlayerDuelStats);
router.get("/leaderboard", getDuelLeaderboard);

export default router;

