import express from "express";
import { adminLogin, getAdminMe } from "../../Controllers/admin/auth.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.post("/login", adminLogin);
router.get("/me", protectAdmin, getAdminMe);

export default router;
