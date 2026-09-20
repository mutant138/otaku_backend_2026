import mongoose from "mongoose";

const animeTitleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  aliases: [{
    type: String,
    trim: true,
  }],
  image: {
    type: String,
    default: "",
  },
  genres: [{
    type: String,
  }],
  year: Number,
  score: Number,
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "AnimeCategory",
  }],
  popularity: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

animeTitleSchema.index({ title: "text", aliases: "text" });

export default mongoose.model("AnimeTitle", animeTitleSchema);
