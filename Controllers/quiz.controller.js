import QuizQuestion from "../Models/quizQuestion.schema.js";
import { generateAIQuestions } from "../utils/aiQuestionGenerator.js";

/**
 * Get personalized match/duel questions based on player favorite titles.
 * If titles have fewer questions in DB, automatically triggers AI to generate more.
 */
export async function getMatchQuizQuestions(req, res) {
  try {
    const { titles = [], types = [], count = 5, difficulty } = req.query;

    let titleList = [];
    if (Array.isArray(titles)) {
      titleList = titles;
    } else if (typeof titles === "string" && titles.trim()) {
      titleList = titles.split(",").map((t) => t.trim());
    }

    let typeList = [];
    if (Array.isArray(types)) {
      typeList = types;
    } else if (typeof types === "string" && types.trim()) {
      typeList = types.split(",").map((t) => t.trim());
    }

    const questionLimit = Math.min(Math.max(parseInt(count, 10) || 5, 1), 20);

    const query = {};

    if (titleList.length > 0) {
      // Create regex list for titles
      const titleRegexes = titleList.map((t) => new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"));
      query.title = { $in: titleRegexes };
    }

    if (typeList.length > 0) {
      query.type = { $in: typeList };
    }

    if (difficulty && ["easy", "medium", "hard"].includes(difficulty.toLowerCase())) {
      query.difficulty = difficulty.toLowerCase();
    }

    // 1. Fetch random sample from matching questions
    let questions = await QuizQuestion.aggregate([
      { $match: query },
      { $sample: { size: questionLimit } },
    ]);

    // 2. If fewer questions found than requested, fill with general anime/game trivia or on-demand AI generation
    if (questions.length < questionLimit) {
      const needed = questionLimit - questions.length;
      const existingIds = questions.map((q) => q._id);

      const fallbackQuestions = await QuizQuestion.aggregate([
        { $match: { _id: { $nin: existingIds } } },
        { $sample: { size: needed } },
      ]);

      questions = [...questions, ...fallbackQuestions];
    }

    // 3. For custom title without any questions, generate on-the-fly using self-hosted AI in background
    if (titleList.length > 0 && questions.length < questionLimit) {
      for (const customTitle of titleList) {
        generateAIQuestions({
          title: customTitle,
          type: typeList[0] || "anime",
          count: 5,
        })
          .then(async (newQuestions) => {
            for (const nq of newQuestions) {
              await QuizQuestion.findOneAndUpdate(
                { title: customTitle, question: nq.question },
                { $setOnInsert: nq },
                { upsert: true }
              );
            }
          })
          .catch((err) => console.warn(`[Quiz Controller] Background AI generation for "${customTitle}" failed:`, err.message));
      }
    }

    return res.status(200).json({
      status: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error("Error fetching match quiz questions:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve quiz questions.",
      error: error.message,
    });
  }
}

/**
 * On-demand AI question generation for a specific title.
 */
export async function generateQuestionsForTitle(req, res) {
  try {
    const { title, type = "anime", count = 5, category = "General" } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        status: false,
        message: "Title is required for generating questions.",
      });
    }

    const generated = await generateAIQuestions({
      title: title.trim(),
      type: type === "game" ? "game" : "anime",
      count: Math.min(Math.max(parseInt(count, 10) || 5, 1), 10),
      category,
    });

    const saved = [];
    for (const q of generated) {
      const doc = await QuizQuestion.findOneAndUpdate(
        { title: title.trim(), question: q.question },
        { $setOnInsert: q },
        { upsert: true, new: true }
      );
      saved.push(doc);
    }

    return res.status(200).json({
      status: true,
      message: `Generated and stored ${saved.length} questions for "${title}".`,
      questions: saved,
    });
  } catch (error) {
    console.error("Error generating quiz questions via AI:", error);
    return res.status(500).json({
      status: false,
      message: "AI question generation failed.",
      error: error.message,
    });
  }
}

/**
 * Get Quiz Database stats (total questions, breakdown by type, top titles).
 */
export async function getQuizStats(req, res) {
  try {
    const total = await QuizQuestion.countDocuments();
    const animeCount = await QuizQuestion.countDocuments({ type: "anime" });
    const gameCount = await QuizQuestion.countDocuments({ type: "game" });

    const topTitles = await QuizQuestion.aggregate([
      { $group: { _id: "$title", count: { $sum: 1 }, type: { $first: "$type" } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    return res.status(200).json({
      status: true,
      stats: {
        total,
        animeCount,
        gameCount,
        topTitles,
      },
    });
  } catch (error) {
    console.error("Error fetching quiz stats:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve quiz stats.",
      error: error.message,
    });
  }
}
