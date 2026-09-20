import express from "express";
import authRoutes from "./auth.admin.routes.js";
import statsRoutes from "./stats.admin.routes.js";
import userRoutes from "./user.admin.routes.js";
import categoryRoutes from "./category.admin.routes.js";
import titleRoutes from "./title.admin.routes.js";
import planRoutes from "./plan.admin.routes.js";
import paymentRoutes from "./payment.admin.routes.js";
import reportRoutes from "./report.admin.routes.js";
import locationRoutes from "./location.admin.routes.js";
import emailRoutes from "./email.admin.routes.js";
import blogRoutes from "./blog.admin.routes.js";
import feedbackRoutes from "./feedback.admin.routes.js";
import loginHistoryRoutes from "./loginHistory.admin.routes.js";
import quizQuestionRoutes from "./quizQuestion.admin.routes.js";
import duelRoutes from "./duel.admin.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/stats", statsRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/titles", titleRoutes);
router.use("/plans", planRoutes);
router.use("/payments", paymentRoutes);
router.use("/reports", reportRoutes);
router.use("/locations", locationRoutes);
router.use("/emails", emailRoutes);
router.use("/blogs", blogRoutes);
router.use("/feedbacks", feedbackRoutes);
router.use("/login-history", loginHistoryRoutes);
router.use("/quiz-questions", quizQuestionRoutes);
router.use("/duels", duelRoutes);

export default router;
