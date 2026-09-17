import express from "express";
import {
  getPublicBlogs,
  getPublicBlogBySlug,
} from "../Controllers/blog.public.controller.js";

const router = express.Router();

router.get("/blogs", getPublicBlogs);
router.get("/blogs/:slug", getPublicBlogBySlug);

export default router;
