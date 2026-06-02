import mongoose from "mongoose";

const animeTitleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  image: String,
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

export default mongoose.model("AnimeTitle", animeTitleSchema);
