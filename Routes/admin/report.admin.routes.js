import express from "express";
import {
  getAllReports,
  getReportById,
  banReportedUser,
  deleteReport,
} from "../../Controllers/admin/report.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/", getAllReports);
router.get("/:id", getReportById);
router.post("/:id/ban-user", banReportedUser);
router.delete("/:id", deleteReport);

export default router;
