import dbCommonQuery from "../../utils/dbCommonQuery.js";
import { QuizQuestion, AnimeTitle, GameTitle } from "../../Models/index.js";

// ── GET QUIZ QUESTIONS (With Pagination, Search, Filter by Type, Difficulty, Title) ──
export const getQuizQuestions = async (req, res) => {
  try {
    const { q, type, difficulty, title, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (type && type !== "all") {
      filter.type = type;
    }
    if (difficulty && difficulty !== "all") {
      filter.difficulty = difficulty;
    }
    if (title && title.trim()) {
      filter.title = new RegExp(title.trim(), "i");
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { question: regex },
        { title: regex },
        { category: regex },
        { explanation: regex },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [questions, total] = await Promise.all([
      QuizQuestion.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      QuizQuestion.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: true,
      data: questions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("Get Quiz Questions Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch quiz questions." });
  }
};

// ── GET QUIZ QUESTIONS STATS ──
export const getQuizQuestionStats = async (req, res) => {
  try {
    const [total, animeCount, gameCount, easyCount, mediumCount, hardCount] = await Promise.all([
      QuizQuestion.countDocuments({}),
      QuizQuestion.countDocuments({ type: "anime" }),
      QuizQuestion.countDocuments({ type: "game" }),
      QuizQuestion.countDocuments({ difficulty: "easy" }),
      QuizQuestion.countDocuments({ difficulty: "medium" }),
      QuizQuestion.countDocuments({ difficulty: "hard" }),
    ]);

    const distinctTitles = await QuizQuestion.distinct("title");

    return res.status(200).json({
      status: true,
      data: {
        total,
        animeCount,
        gameCount,
        easyCount,
        mediumCount,
        hardCount,
        coveredTitlesCount: distinctTitles.length,
      },
    });
  } catch (error) {
    console.error("Get Quiz Stats Error:", error);
    return res.status(500).json({ status: false, message: "Failed to fetch stats." });
  }
};

// ── CREATE QUIZ QUESTION ──
export const createQuizQuestion = async (req, res) => {
  try {
    const { question, options, correctAnswer, explanation, type, title, difficulty } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ status: false, message: "Question text is required." });
    }
    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ status: false, message: "Exactly 4 options are required." });
    }
    if (!correctAnswer || !correctAnswer.trim()) {
      return res.status(400).json({ status: false, message: "Correct answer is required." });
    }

    // Try linking to catalog title
    let titleRef = null;
    let titleRefModel = type === "game" ? "GameTitle" : "AnimeTitle";
    if (title && title.trim()) {
      const TitleModel = type === "game" ? GameTitle : AnimeTitle;
      const found = await TitleModel.findOne({
        $or: [
          { title: new RegExp(`^${title.trim()}$`, "i") },
          { aliases: new RegExp(`^${title.trim()}$`, "i") },
        ],
      });
      if (found) titleRef = found._id;
    }

    const newQuestion = await QuizQuestion.create({
      question: question.trim(),
      options: options.map((o) => String(o).trim()),
      correctAnswer: correctAnswer.trim(),
      explanation: explanation ? explanation.trim() : "",
      type: type === "game" ? "game" : "anime",
      title: title?.trim() || "Anime Lore",
      titleRef: titleRef || undefined,
      titleRefModel: titleRefModel,
      difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
      source: "admin-created",
      tags: [title?.trim() || "Trivia", type || "anime"],
    });

    return res.status(201).json({ status: true, message: "Quiz question created successfully.", data: newQuestion });
  } catch (error) {
    console.error("Create Quiz Question Error:", error);
    return res.status(500).json({ status: false, message: "Failed to create quiz question." });
  }
};

// ── UPDATE QUIZ QUESTION ──
export const updateQuizQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, options, correctAnswer, explanation, type, title, difficulty } = req.body;

    const existing = await QuizQuestion.findById(id);
    if (!existing) {
      return res.status(404).json({ status: false, message: "Question not found." });
    }

    if (question) existing.question = question.trim();
    if (Array.isArray(options) && options.length === 4) {
      existing.options = options.map((o) => String(o).trim());
    }
    if (correctAnswer) existing.correctAnswer = correctAnswer.trim();
    if (explanation !== undefined) existing.explanation = explanation.trim();
    if (type) existing.type = type === "game" ? "game" : "anime";
    if (title) existing.title = title.trim();
    if (difficulty) existing.difficulty = difficulty;

    await existing.save();

    return res.status(200).json({ status: true, message: "Question updated successfully.", data: existing });
  } catch (error) {
    console.error("Update Quiz Question Error:", error);
    return res.status(500).json({ status: false, message: "Failed to update question." });
  }
};

// ── DELETE QUIZ QUESTION ──
export const deleteQuizQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await QuizQuestion.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ status: false, message: "Question not found." });
    }

    return res.status(200).json({ status: true, message: "Quiz question deleted successfully." });
  } catch (error) {
    console.error("Delete Quiz Question Error:", error);
    return res.status(500).json({ status: false, message: "Failed to delete question." });
  }
};
