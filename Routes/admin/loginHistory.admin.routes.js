import express from "express";
import {
  getLoginHistories,
  getLoginHistoryStats,
  getUserLoginHistory,
  deleteLoginHistory,
  clearOlderLoginHistories,
} from "../../Controllers/admin/loginHistory.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/stats", getLoginHistoryStats);
router.get("/user/:userId", getUserLoginHistory);
router.get("/", getLoginHistories);
router.post("/clear-older", clearOlderLoginHistories);
router.delete("/:id", deleteLoginHistory);

export default router;
