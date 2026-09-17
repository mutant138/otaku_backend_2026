import dbCommonQuery from "../utils/dbCommonQuery.js";

/**
 * Get Published Blogs for Frontend
 * GET /api/blogs
 */
export const getPublicBlogs = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const filter = { isPublished: true };

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
        { focusKeywords: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const blogs = await dbCommonQuery({
      model: "Blog",
      action: "find",
      filter,
      sort: { publishedAt: -1, createdAt: -1 },
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
    console.error("Get Public Blogs Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch blogs." });
  }
};

/**
 * Get Single Published Blog by Slug
 * GET /api/blogs/:slug
 */
export const getPublicBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const blog = await dbCommonQuery({
      model: "Blog",
      action: "findOne",
      filter: { slug, isPublished: true },
      lean: false,
    });

    if (!blog) {
      return res.status(404).json({ status: false, message: "Article not found." });
    }

    // Increment views count asynchronously
    blog.viewsCount = (blog.viewsCount || 0) + 1;
    await blog.save().catch((err) => console.error("Error saving view count:", err));

    return res.status(200).json({ status: true, data: blog });
  } catch (error) {
    console.error("Get Public Blog by Slug Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch article." });
  }
};
