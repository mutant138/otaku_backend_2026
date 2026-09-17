import express from "express";
import {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  togglePublish,
} from "../../Controllers/admin/blog.admin.controller.js";

const router = express.Router();

router.get("/", getAllBlogs);
router.get("/:id", getBlogById);
router.post("/", createBlog);
router.put("/:id", updateBlog);
router.delete("/:id", deleteBlog);
router.patch("/:id/publish", togglePublish);

export default router;
