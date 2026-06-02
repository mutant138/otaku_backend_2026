import mongoose from "mongoose";

const animeCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  slug: {
    type: String,
    unique: true,
  },
  description: String,
  icon: String,
}, {
  timestamps: true,
});

export default mongoose.model("AnimeCategory", animeCategorySchema);
