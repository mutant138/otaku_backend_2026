import mongoose from "mongoose";

const gameTitleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  image: String,
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "GameCategory",
  }],
  popularity: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.model("GameTitle", gameTitleSchema);
