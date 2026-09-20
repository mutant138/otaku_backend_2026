import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../db.js";
import { QuizQuestion, AnimeTitle, GameTitle } from "../Models/index.js";

dotenv.config();

/**
 * Link all QuizQuestions to their respective AnimeTitle and GameTitle ObjectId references.
 */
export async function linkAllQuestionRefs() {
  await connectDB();

  console.log("🔗 [Linker] Starting automatic reference linking for all QuizQuestions...");

  const animeList = await AnimeTitle.find().lean();
  const gameList = await GameTitle.find().lean();

  console.log(`Loaded ${animeList.length} Anime titles and ${gameList.length} Game titles.`);

  const unlinkedQuestions = await QuizQuestion.find({
    $or: [{ titleRef: null }, { titleRefModel: null }],
  });

  console.log(`Found ${unlinkedQuestions.length} unlinked questions to process.`);

  let linkedCount = 0;
  let createdTitleCount = 0;

  for (const q of unlinkedQuestions) {
    const qTitle = (q.title || "").trim();
    if (!qTitle) continue;

    let matchedRef = null;
    let refModel = null;

    if (q.type === "anime") {
      // Find in animeList
      matchedRef = animeList.find(
        (a) =>
          a.title.toLowerCase() === qTitle.toLowerCase() ||
          (a.aliases && a.aliases.some((al) => al.toLowerCase() === qTitle.toLowerCase()))
      );

      if (!matchedRef) {
        // Create title in AnimeTitle if not existing yet
        const newAnime = await AnimeTitle.create({
          title: qTitle,
          genres: q.category ? [q.category] : ["Anime"],
          aliases: [qTitle],
        });
        animeList.push(newAnime);
        matchedRef = newAnime;
        createdTitleCount++;
      }
      refModel = "AnimeTitle";
    } else {
      // Find in gameList
      matchedRef = gameList.find(
        (g) =>
          g.title.toLowerCase() === qTitle.toLowerCase() ||
          (g.aliases && g.aliases.some((al) => al.toLowerCase() === qTitle.toLowerCase()))
      );

      if (!matchedRef) {
        // Create title in GameTitle if not existing yet
        const newGame = await GameTitle.create({
          title: qTitle,
          genres: q.category ? [q.category] : ["Gaming"],
          aliases: [qTitle],
        });
        gameList.push(newGame);
        matchedRef = newGame;
        createdTitleCount++;
      }
      refModel = "GameTitle";
    }

    if (matchedRef && refModel) {
      q.titleRef = matchedRef._id;
      q.titleRefModel = refModel;
      await q.save();
      linkedCount++;
    }
  }

  console.log(`✅ [Linker Complete] Successfully linked ${linkedCount} questions (Created ${createdTitleCount} new catalog titles).`);
  return { linkedCount, createdTitleCount };
}

if (process.argv[1]?.endsWith("linkQuestionRefs.js")) {
  linkAllQuestionRefs()
    .then((res) => {
      console.log("Linking finished:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Linking error:", err);
      process.exit(1);
    });
}

export default linkAllQuestionRefs;
