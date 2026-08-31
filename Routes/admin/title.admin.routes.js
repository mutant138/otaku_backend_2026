import express from "express";
import {
  getAnimeTitles,
  createAnimeTitle,
  updateAnimeTitle,
  deleteAnimeTitle,
  getGameTitles,
  createGameTitle,
  updateGameTitle,
  deleteGameTitle,
} from "../../Controllers/admin/title.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

// Anime Titles
router.get("/anime", getAnimeTitles);
router.post("/anime", createAnimeTitle);
router.put("/anime/:id", updateAnimeTitle);
router.delete("/anime/:id", deleteAnimeTitle);

// Game Titles
router.get("/game", getGameTitles);
router.post("/game", createGameTitle);
router.put("/game/:id", updateGameTitle);
router.delete("/game/:id", deleteGameTitle);

export default router;
