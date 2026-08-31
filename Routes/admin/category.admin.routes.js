import express from "express";
import {
  getAnimeCategories,
  createAnimeCategory,
  updateAnimeCategory,
  deleteAnimeCategory,
  getGameCategories,
  createGameCategory,
  updateGameCategory,
  deleteGameCategory,
} from "../../Controllers/admin/category.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

// Anime Categories
router.get("/anime", getAnimeCategories);
router.post("/anime", createAnimeCategory);
router.put("/anime/:id", updateAnimeCategory);
router.delete("/anime/:id", deleteAnimeCategory);

// Game Categories
router.get("/game", getGameCategories);
router.post("/game", createGameCategory);
router.put("/game/:id", updateGameCategory);
router.delete("/game/:id", deleteGameCategory);

export default router;
