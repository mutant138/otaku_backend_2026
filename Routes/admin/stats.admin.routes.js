import express from "express";
import { getDashboardStats } from "../../Controllers/admin/stats.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.get("/", protectAdmin, getDashboardStats);

export default router;
