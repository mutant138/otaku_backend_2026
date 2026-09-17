import mongoose from "mongoose";

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    coverImage: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "Matchmaking Guides",
      trim: true,
    },
    authorName: {
      type: String,
      default: "Otaku Guildmaster",
      trim: true,
    },
    authorTitle: {
      type: String,
      default: "Senior Matchmaker",
      trim: true,
    },
    authorAvatar: {
      type: String,
      default: "",
    },
    readTime: {
      type: String,
      default: "5 min read",
    },
    tags: {
      type: [String],
      default: [],
    },
    // SEO-specific properties
    metaTitle: {
      type: String,
      default: "",
      trim: true,
    },
    metaDescription: {
      type: String,
      default: "",
      trim: true,
    },
    focusKeywords: {
      type: [String],
      default: [],
    },
    canonicalUrl: {
      type: String,
      default: "",
    },
    viewsCount: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Blog", blogSchema);
