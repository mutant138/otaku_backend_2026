import express from "express";
import {
  getAllEmailTemplates,
  getEmailTemplateById,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendTestEmail,
} from "../../Controllers/admin/email.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/", getAllEmailTemplates);
router.post("/", createEmailTemplate);
router.post("/test", sendTestEmail);
router.get("/:id", getEmailTemplateById);
router.put("/:id", updateEmailTemplate);
router.delete("/:id", deleteEmailTemplate);

export default router;
