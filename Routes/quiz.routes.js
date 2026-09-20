import express from "express";
import {
  getMatchQuizQuestions,
  generateQuestionsForTitle,
  getQuizStats,
} from "../Controllers/quiz.controller.js";

const router = express.Router();

router.get("/match-questions", getMatchQuizQuestions);
router.post("/generate", generateQuestionsForTitle);
router.get("/stats", getQuizStats);

export default router;
