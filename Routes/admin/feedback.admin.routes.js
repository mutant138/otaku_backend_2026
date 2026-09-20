import express from "express";
import {
  getAllFeedbacks,
  getFeedbackStats,
  updateFeedback,
  deleteFeedback,
} from "../../Controllers/admin/feedback.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/stats", getFeedbackStats);
router.get("/", getAllFeedbacks);
router.patch("/:id", updateFeedback);
router.delete("/:id", deleteFeedback);

export default router;
