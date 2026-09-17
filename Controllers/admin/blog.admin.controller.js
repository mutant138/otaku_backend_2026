import dbCommonQuery from "../../utils/dbCommonQuery.js";

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

/**
 * Get All Blogs (Admin)
 * GET /api/admin/blogs
 */
export const getAllBlogs = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (status === "published") {
      filter.isPublished = true;
    } else if (status === "draft") {
      filter.isPublished = false;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const blogs = await dbCommonQuery({
      model: "Blog",
      action: "find",
      filter,
      sort: { createdAt: -1 },
      skip,
      limit: parseInt(limit, 10),
      lean: true,
    });

    const total = await dbCommonQuery({
      model: "Blog",
      action: "countDocuments",
      filter,
    });

    return res.status(200).json({
      status: true,
      data: blogs,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    console.error("Get All Blogs Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch blogs." });
  }
};

/**
 * Get Blog by ID
 * GET /api/admin/blogs/:id
 */
export const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await dbCommonQuery({
      model: "Blog",
      action: "findById",
      filter: id,
      lean: true,
    });

    if (!blog) {
      return res.status(404).json({ status: false, message: "Blog not found." });
    }

    return res.status(200).json({ status: true, data: blog });
  } catch (error) {
    console.error("Get Blog By ID Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch blog." });
  }
};

/**
 * Create Blog
 * POST /api/admin/blogs
 */
export const createBlog = async (req, res) => {
  try {
    const {
      title,
      slug,
      description,
      content,
      coverImage,
      category,
      authorName,
      authorTitle,
      authorAvatar,
      readTime,
      tags,
      metaTitle,
      metaDescription,
      focusKeywords,
      canonicalUrl,
      isPublished,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        status: false,
        message: "Title and Content are required.",
      });
    }

    const finalSlug = slugify(slug || title);

    // Check slug uniqueness
    const existing = await dbCommonQuery({
      model: "Blog",
      action: "findOne",
      filter: { slug: finalSlug },
    });

    if (existing) {
      return res.status(409).json({
        status: false,
        message: "A blog with this URL slug already exists. Please choose a unique slug.",
      });
    }

    const blogData = {
      title: title.trim(),
      slug: finalSlug,
      description: (description || "").trim(),
      content,
      coverImage: coverImage || "",
      category: category || "Matchmaking Guides",
      authorName: authorName || "Otaku Guildmaster",
      authorTitle: authorTitle || "Senior Matchmaker",
      authorAvatar: authorAvatar || "",
      readTime: readTime || "5 min read",
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(",").map(t => t.trim()) : []),
      metaTitle: (metaTitle || title).trim(),
      metaDescription: (metaDescription || description || "").trim(),
      focusKeywords: Array.isArray(focusKeywords) ? focusKeywords : (focusKeywords ? focusKeywords.split(",").map(k => k.trim()) : []),
      canonicalUrl: canonicalUrl || "",
      isPublished: isPublished !== undefined ? isPublished : true,
      publishedAt: isPublished !== false ? new Date() : null,
    };

    const newBlog = await dbCommonQuery({
      model: "Blog",
      action: "create",
      payload: blogData,
    });

    return res.status(201).json({
      status: true,
      message: "Blog post created successfully.",
      data: newBlog,
    });
  } catch (error) {
    console.error("Create Blog Error:", error);
    return res.status(500).json({ status: false, message: error.message || "Failed to create blog." });
  }
};

/**
 * Update Blog
 * PUT /api/admin/blogs/:id
 */
export const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      slug,
      description,
      content,
      coverImage,
      category,
      authorName,
      authorTitle,
      authorAvatar,
      readTime,
      tags,
      metaTitle,
      metaDescription,
      focusKeywords,
      canonicalUrl,
      isPublished,
    } = req.body;

    const existing = await dbCommonQuery({
      model: "Blog",
      action: "findById",
      filter: id,
    });

    if (!existing) {
      return res.status(404).json({ status: false, message: "Blog not found." });
    }

    let finalSlug = existing.slug;
    if (slug && slug !== existing.slug) {
      finalSlug = slugify(slug);
      const slugConflict = await dbCommonQuery({
        model: "Blog",
        action: "findOne",
        filter: { slug: finalSlug, _id: { $ne: id } },
      });
      if (slugConflict) {
        return res.status(409).json({
          status: false,
          message: "A blog with this URL slug already exists.",
        });
      }
    }

    const updatePayload = {
      ...(title && { title: title.trim() }),
      slug: finalSlug,
      ...(description !== undefined && { description: description.trim() }),
      ...(content && { content }),
      ...(coverImage !== undefined && { coverImage }),
      ...(category && { category }),
      ...(authorName !== undefined && { authorName }),
      ...(authorTitle !== undefined && { authorTitle }),
      ...(authorAvatar !== undefined && { authorAvatar }),
      ...(readTime !== undefined && { readTime }),
      ...(tags !== undefined && {
        tags: Array.isArray(tags) ? tags : tags.split(",").map((t) => t.trim()),
      }),
      ...(metaTitle !== undefined && { metaTitle: metaTitle.trim() }),
      ...(metaDescription !== undefined && { metaDescription: metaDescription.trim() }),
      ...(focusKeywords !== undefined && {
        focusKeywords: Array.isArray(focusKeywords) ? focusKeywords : focusKeywords.split(",").map((k) => k.trim()),
      }),
      ...(canonicalUrl !== undefined && { canonicalUrl }),
      ...(isPublished !== undefined && {
        isPublished,
        publishedAt: isPublished ? (existing.publishedAt || new Date()) : existing.publishedAt,
      }),
    };

    const updatedBlog = await dbCommonQuery({
      model: "Blog",
      action: "findByIdAndUpdate",
      filter: id,
      payload: updatePayload,
      options: { new: true },
    });

    return res.status(200).json({
      status: true,
      message: "Blog updated successfully.",
      data: updatedBlog,
    });
  } catch (error) {
    console.error("Update Blog Error:", error);
    return res.status(500).json({ status: false, message: error.message || "Failed to update blog." });
  }
};

/**
 * Delete Blog
 * DELETE /api/admin/blogs/:id
 */
export const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await dbCommonQuery({
      model: "Blog",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({ status: false, message: "Blog not found." });
    }

    return res.status(200).json({ status: true, message: "Blog deleted successfully." });
  } catch (error) {
    console.error("Delete Blog Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete blog." });
  }
};

/**
 * Toggle Publish Status
 * PATCH /api/admin/blogs/:id/publish
 */
export const togglePublish = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await dbCommonQuery({
      model: "Blog",
      action: "findById",
      filter: id,
    });

    if (!blog) {
      return res.status(404).json({ status: false, message: "Blog not found." });
    }

    const nextStatus = !blog.isPublished;
    const updated = await dbCommonQuery({
      model: "Blog",
      action: "findByIdAndUpdate",
      filter: id,
      payload: {
        isPublished: nextStatus,
        ...(nextStatus && !blog.publishedAt && { publishedAt: new Date() }),
      },
      options: { new: true },
    });

    return res.status(200).json({
      status: true,
      message: `Blog is now ${nextStatus ? "Published" : "Draft"}.`,
      data: updated,
    });
  } catch (error) {
    console.error("Toggle Publish Error:", error);
    return res.status(500).json({ status: false, message: "Failed to toggle status." });
  }
};
