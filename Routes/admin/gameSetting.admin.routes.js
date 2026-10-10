import express from "express";
import {
  getAdminGameSettings,
  updateAdminGameSetting,
} from "../../Controllers/admin/gameSetting.admin.controller.js";
import { protectAdmin } from "../../middleware/adminAuth.middleware.js";

const router = express.Router();

router.use(protectAdmin);

router.get("/", getAdminGameSettings);
router.put("/:gameId", updateAdminGameSetting);

export default router;

