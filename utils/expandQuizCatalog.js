import dotenv from "dotenv";
import connectDB from "../db.js";
import { QuizQuestion, AnimeTitle, GameTitle } from "../Models/index.js";
import { generateAIQuestions } from "./aiQuestionGenerator.js";
import { linkAllQuestionRefs } from "./linkQuestionRefs.js";

dotenv.config();

/**
 * Expand Quiz Catalog with AI-generated questions
 * 
 * Usage:
 *   node utils/expandQuizCatalog.js
 *   node utils/expandQuizCatalog.js --target=5 --type=both
 *   node utils/expandQuizCatalog.js --target=10 --type=game
 */
export async function expandCatalogQuestions() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const targetArg = args.find((a) => a.startsWith("--target="));
  const typeArg = args.find((a) => a.startsWith("--type="));

  const targetPerTitle = targetArg ? parseInt(targetArg.split("=")[1], 10) || 5 : 5;
  const mode = typeArg ? typeArg.split("=")[1].toLowerCase() : "both"; // 'game', 'anime', 'both'

  await connectDB();

  console.log("\n========================================================");
  console.log("       OTAKU DUO — AI QUIZ CATALOG EXPANDER");
  console.log("========================================================");
  console.log(`📌 Target questions per title: ${targetPerTitle}`);
  console.log(`📌 Mode: ${mode.toUpperCase()}`);
  console.log("--------------------------------------------------------\n");

  let totalAdded = 0;
  let totalErrors = 0;

  // 1. Process Gaming Titles
  if (mode === "game" || mode === "both") {
    const allGames = await GameTitle.find().sort({ title: 1 }).lean();
    console.log(`🎮 === [1/2] PROCESSING ${allGames.length} GAMING TITLES ===\n`);

    for (let i = 0; i < allGames.length; i++) {
      const game = allGames[i];
      const progress = `[${i + 1}/${allGames.length}]`;

      const currentCount = await QuizQuestion.countDocuments({
        type: "game",
        $or: [{ titleRef: game._id }, { title: game.title }],
      });

      const needed = targetPerTitle - currentCount;
      if (needed <= 0) {
        console.log(`${progress} ⏩ ${game.title.padEnd(35)} (Has: ${currentCount}/${targetPerTitle}) — OK`);
        continue;
      }

      console.log(`${progress} ⏳ ${game.title.padEnd(35)} (Has: ${currentCount}/${targetPerTitle}) — Generating ${needed} questions...`);

      try {
        const generated = await generateAIQuestions({
          title: game.title,
          type: "game",
          count: needed,
          category: (game.genres && game.genres[0]) || "Gaming",
        });

        let addedForTitle = 0;
        if (generated && generated.length > 0) {
          for (const item of generated) {
            const exists = await QuizQuestion.findOne({
              title: game.title,
              question: item.question,
            });

            if (!exists) {
              await QuizQuestion.create({
                ...item,
                title: game.title,
                titleRef: game._id,
                titleRefModel: "GameTitle",
              });
              addedForTitle++;
              totalAdded++;
            }
          }
        }

        console.log(`${progress} ✅ ${game.title.padEnd(35)} +${addedForTitle} added (Total: ${currentCount + addedForTitle})`);
      } catch (err) {
        totalErrors++;
        console.warn(`${progress} ⚠️ ${game.title.padEnd(35)} Failed: ${err.message}`);
      }
    }
  }

  // 2. Process Anime Titles
  if (mode === "anime" || mode === "both") {
    const allAnimes = await AnimeTitle.find().sort({ title: 1 }).lean();
    console.log(`\n🎌 === [2/2] PROCESSING ${allAnimes.length} ANIME TITLES ===\n`);

    for (let i = 0; i < allAnimes.length; i++) {
      const anime = allAnimes[i];
      const progress = `[${i + 1}/${allAnimes.length}]`;

      const currentCount = await QuizQuestion.countDocuments({
        type: "anime",
        $or: [{ titleRef: anime._id }, { title: anime.title }],
      });

      const needed = targetPerTitle - currentCount;
      if (needed <= 0) {
        console.log(`${progress} ⏩ ${anime.title.padEnd(35)} (Has: ${currentCount}/${targetPerTitle}) — OK`);
        continue;
      }

      console.log(`${progress} ⏳ ${anime.title.padEnd(35)} (Has: ${currentCount}/${targetPerTitle}) — Generating ${needed} questions...`);

      try {
        const generated = await generateAIQuestions({
          title: anime.title,
          type: "anime",
          count: needed,
          category: (anime.genres && anime.genres[0]) || "Anime Lore",
        });

        let addedForTitle = 0;
        if (generated && generated.length > 0) {
          for (const item of generated) {
            const exists = await QuizQuestion.findOne({
              title: anime.title,
              question: item.question,
            });

            if (!exists) {
              await QuizQuestion.create({
                ...item,
                title: anime.title,
                titleRef: anime._id,
                titleRefModel: "AnimeTitle",
              });
              addedForTitle++;
              totalAdded++;
            }
          }
        }

        console.log(`${progress} ✅ ${anime.title.padEnd(35)} +${addedForTitle} added (Total: ${currentCount + addedForTitle})`);
      } catch (err) {
        totalErrors++;
        console.warn(`${progress} ⚠️ ${anime.title.padEnd(35)} Failed: ${err.message}`);
      }
    }
  }

  // 3. Link references
  console.log("\n🔗 [Linker] Synchronizing title references...");
  await linkAllQuestionRefs();

  // 4. Final summary
  const finalAnime = await QuizQuestion.countDocuments({ type: "anime" });
  const finalGame = await QuizQuestion.countDocuments({ type: "game" });
  const finalTotal = await QuizQuestion.countDocuments();

  console.log("\n========================================================");
  console.log("                  COMPLETION SUMMARY                    ");
  console.log("========================================================");
  console.log(`✨ Total New Questions Added: ${totalAdded}`);
  console.log(`⚠️ Errors:                    ${totalErrors}`);
  console.log(`📊 Total Anime Questions:     ${finalAnime}`);
  console.log(`📊 Total Game Questions:      ${finalGame}`);
  console.log(`🎯 Grand Total Questions:     ${finalTotal}`);
  console.log("========================================================\n");
}

if (process.argv[1]?.endsWith("expandQuizCatalog.js")) {
  expandCatalogQuestions()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}
