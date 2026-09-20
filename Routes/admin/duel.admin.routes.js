import express from "express";
import {
  getAdminDuels,
  getAdminDuelStats,
  deleteAdminDuel,
} from "../../Controllers/admin/duel.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/", getAdminDuels);
router.get("/stats", getAdminDuelStats);
router.delete("/:id", deleteAdminDuel);

export default router;
