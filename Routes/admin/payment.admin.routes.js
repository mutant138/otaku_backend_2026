import express from "express";
import {
  getAllPayments,
  getPaymentById,
  updatePaymentStatus,
} from "../../Controllers/admin/payment.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/", getAllPayments);
router.get("/:id", getPaymentById);
router.put("/:id/status", updatePaymentStatus);

export default router;
