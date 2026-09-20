import mongoose from "mongoose";

const quizQuestionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["anime", "game"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    titleRef: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "titleRefModel",
      default: null,
    },
    titleRefModel: {
      type: String,
      enum: ["AnimeTitle", "GameTitle"],
      default: null,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: [
        (opts) => Array.isArray(opts) && opts.length === 4,
        "Exactly 4 options are required",
      ],
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      index: true,
    },
    explanation: {
      type: String,
      default: "",
    },
    source: {
      type: String,
      default: "self-hosted-ai",
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

quizQuestionSchema.index({ type: 1, title: 1, difficulty: 1 });
quizQuestionSchema.index({ question: "text", title: "text" });

const QuizQuestion = mongoose.model("QuizQuestion", quizQuestionSchema);
export default QuizQuestion;
