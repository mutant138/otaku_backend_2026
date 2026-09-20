import express from "express";
import {
  getQuizQuestions,
  getQuizQuestionStats,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
} from "../../Controllers/admin/quizQuestion.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/", getQuizQuestions);
router.get("/stats", getQuizQuestionStats);
router.post("/", createQuizQuestion);
router.put("/:id", updateQuizQuestion);
router.delete("/:id", deleteQuizQuestion);

export default router;
