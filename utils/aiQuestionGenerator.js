import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const AI_API_BASE_URL =
  process.env.AI_API_BASE_URL || "https://agentwealwin.wearedev.team";
const PRIMARY_MODEL = "qwen2.5:3b";
const FALLBACK_MODELS = ["test-bot:latest", "qwen2.5:0.5b", "qwen3:4b", "qwen2.5:7b"];

/**
 * Generate trivia questions for a specific Anime or Video Game title using company self-hosted Ollama AI.
 */
export async function generateAIQuestions({
  title,
  type = "anime",
  count = 5,
  category = "General",
}) {
  const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];

  const promptText = `Generate ${count} high-quality, authentic multiple-choice trivia questions about "${title}" (${type}, Category: ${category}).
CRITICAL RULES:
- Every question MUST have 4 distinct, real answer choices (NEVER use placeholders like "A", "B", "C", "D").
- Do NOT prefix options with letters like "A." or "1.". Provide just the clean answer text.
- One option MUST be the exact correct answer.
- Output ONLY valid JSON in this exact structure:
{"questions":[{"question":"Which village is Naruto from?","options":["Hidden Leaf Village","Hidden Sand Village","Hidden Mist Village","Hidden Cloud Village"],"correctAnswer":"Hidden Leaf Village","difficulty":"easy","explanation":"Naruto is from Konohagakure (Hidden Leaf)."}]}`;

  let rawContent = null;
  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await axios.post(
        `${AI_API_BASE_URL}/api/generate`,
        {
          model,
          prompt: promptText,
          stream: false,
          format: "json",
          options: {
            temperature: 0.7,
            num_predict: 1024,
          },
        },
        {
          timeout: 90000,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response?.data?.response) {
        rawContent = response.data.response;
        break;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[AI Quiz Generator] Model ${model} notice: ${err.message}. Trying next model...`);
    }
  }

  if (!rawContent) {
    throw new Error(
      `AI question generation failed across all models. Last error: ${lastError?.message || "No response"}`
    );
  }

  // Parse and sanitize JSON output
  try {
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // In case of markdown backticks inside output
      const cleaned = rawContent.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.questions)
      ? parsed.questions
      : [];

    const validated = [];

    for (const q of rawList) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        continue;
      }

      // Clean and strip any accidental "A. ", "1. ", etc. prefixes
      const options = q.options.map((opt) =>
        String(opt).replace(/^[A-Da-d0-9][\.\)\-\:]\s*/, "").trim()
      );

      // Reject any questions that have single-letter options or empty options
      if (
        options.some((opt) => !opt || opt.length <= 1 || /^[A-Da-d]$/.test(opt)) ||
        new Set(options.map((opt) => opt.toLowerCase())).size !== 4
      ) {
        continue;
      }

      let correctAnswer = String(q.correctAnswer || "")
        .replace(/^[A-Da-d0-9][\.\)\-\:]\s*/, "")
        .trim();

      // Ensure correct answer is one of the options
      const exactMatch = options.find(
        (opt) => opt.toLowerCase() === correctAnswer.toLowerCase()
      );
      if (!exactMatch) {
        // Fallback: If not matching, make the first option the correct answer
        correctAnswer = options[0];
      } else {
        correctAnswer = exactMatch;
      }

      const difficulty = ["easy", "medium", "hard"].includes(
        String(q.difficulty).toLowerCase()
      )
        ? String(q.difficulty).toLowerCase()
        : "medium";

      validated.push({
        type,
        title,
        category: category || "General",
        question: q.question.trim(),
        options,
        correctAnswer,
        difficulty,
        explanation: q.explanation ? String(q.explanation).trim() : "",
        source: "self-hosted-ai",
        tags: [title, category, type].filter(Boolean),
      });
    }

    return validated;
  } catch (parseErr) {
    console.error("[AI Quiz Generator] Failed to parse AI response:", rawContent);
    throw new Error(`Invalid JSON format returned by AI: ${parseErr.message}`);
  }
}

export default generateAIQuestions;
