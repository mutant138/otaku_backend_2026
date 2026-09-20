import mongoose from "mongoose";
import dotenv from "dotenv";
import axios from "axios";
import connectDB from "../db.js";
import { QuizQuestion, AnimeTitle, GameTitle } from "../Models/index.js";
import { generateAIQuestions } from "./aiQuestionGenerator.js";

dotenv.config();

// Extended list of top 120 Anime titles across Shonen, Isekai, Romance, Mecha, Sports, Sci-Fi, Dark Fantasy
const POPULAR_ANIME_CATALOG = [
  "One Piece", "Naruto", "Naruto Shippuden", "Dragon Ball Z", "Dragon Ball Super", "Bleach", "Bleach: Thousand-Year Blood War",
  "Attack on Titan", "Jujutsu Kaisen", "Demon Slayer: Kimetsu no Yaiba", "My Hero Academia", "Death Note", "Fullmetal Alchemist: Brotherhood",
  "Hunter x Hunter", "Tokyo Ghoul", "Chainsaw Man", "Solo Leveling", "Sword Art Online", "Code Geass", "Steins;Gate", "Cowboy Bebop",
  "Neon Genesis Evangelion", "JoJo's Bizarre Adventure", "Vinland Saga", "Berserk", "Spy x Family", "Mob Psycho 100", "One Punch Man",
  "Black Clover", "Fairy Tail", "Gintama", "Re:Zero - Starting Life in Another World", "The Rising of the Shield Hero", "Overlord",
  "Mushoku Tensei: Jobless Reincarnation", "That Time I Got Reincarnated as a Slime", "No Game No Life", "KonoSuba", "Frieren: Beyond Journey's End",
  "Oshi no Ko", "Haikyuu!!", "Blue Lock", "Kuroko's Basketball", "Slam Dunk", "Hajime no Ippo", "Your Lie in April", "Kaguya-sama: Love is War",
  "Toradora!", "Clannad", "Horimiya", "The Quintessential Quintuplets", "Rascal Does Not Dream of Bunny Girl Senpai", "Violet Evergarden",
  "Cyberpunk: Edgerunners", "Gurren Lagann", "Kill la Kill", "Psycho-Pass", "Ghost in the Shell", "Akira", "Monster", "Parasyte: The Maxim",
  "Tokyo Revengers", "Dr. Stone", "Fire Force", "Soul Eater", "Fate/Zero", "Fate/stay night: Unlimited Blade Works", "Seven Deadly Sins",
  "InuYasha", "Yu Yu Hakusho", "Rurouni Kenshin", "Trigun", "Hellsing Ultimate", "D.Gray-man", "Noragami", "Bungou Stray Dogs",
  "Assassination Classroom", "Classroom of the Elite", "Danganronpa", "Erased", "Another", "Elfen Lied", "Future Diary", "Blue Exorcist",
  "Akame ga Kill!", "Black Butler", "Ouran High School Host Club", "Fruits Basket", "Kimi ni Todoke", "Nana", "Given", "Banana Fish",
  "Devilman Crybaby", "Baki", "Kengan Ashura", "Megalo Box", "Initial D", "Great Teacher Onizuka", "Samurai Champloo", "Dororo",
  "Vinland Saga Season 2", "Hell's Paradise", "Mashle: Magic and Muscles", "Delicious in Dungeon", "Kaiju No. 8", "Wind Breaker",
  "Wistoria: Wand and Sword", "A Sign of Affection", "The Apothecary Diaries", "Undead Unluck", "Shangri-La Frontier", "Ragna Crimson"
];

// Extended list of top 120 Video Games across FPS, RPG, MOBA, Battle Royale, Action-Adventure, Soulslike, Fighting
const POPULAR_GAME_CATALOG = [
  "Grand Theft Auto V", "Grand Theft Auto VI", "Grand Theft Auto: San Andreas", "Grand Theft Auto: Vice City", "Valorant", "Counter-Strike 2",
  "Counter-Strike: Global Offensive", "League of Legends", "Dota 2", "Overwatch 2", "Team Fortress 2", "Apex Legends", "Fortnite",
  "Call of Duty: Warzone", "Call of Duty: Black Ops 6", "Call of Duty: Modern Warfare", "Rainbow Six Siege", "Elden Ring", "Dark Souls III",
  "Dark Souls", "Bloodborne", "Sekiro: Shadows Die Twice", "Demon's Souls", "Lies of P", "Black Myth: Wukong", "The Witcher 3: Wild Hunt",
  "Cyberpunk 2077", "Skyrim (The Elder Scrolls V)", "Fallout 4", "Fallout: New Vegas", "Baldur's Gate 3", "Divinity: Original Sin 2",
  "Genshin Impact", "Honkai: Star Rail", "Zenless Zone Zero", "Wuthering Waves", "Persona 5 Royal", "Persona 3 Reload", "Final Fantasy VII Remake",
  "Final Fantasy XIV", "Final Fantasy XVI", "World of Warcraft", "Minecraft", "Roblox", "Terraria", "Stardew Valley", "Animal Crossing: New Horizons",
  "Red Dead Redemption 2", "Red Dead Redemption", "The Last of Us Part I", "The Last of Us Part II", "God of War (2018)", "God of War Ragnarok",
  "Marvel's Spider-Man", "Marvel's Spider-Man 2", "Batman: Arkham City", "Batman: Arkham Knight", "Uncharted 4: A Thief's End", "Horizon Zero Dawn",
  "Horizon Forbidden West", "Ghost of Tsushima", "Assassin's Creed Valhalla", "Assassin's Creed Mirage", "Assassin's Creed Odyssey", "Hogwarts Legacy",
  "The Legend of Zelda: Breath of the Wild", "The Legend of Zelda: Tears of the Kingdom", "Super Mario Odyssey", "Super Mario Bros. Wonder",
  "Super Smash Bros. Ultimate", "Mario Kart 8 Deluxe", "Pokemon Scarlet and Violet", "Pokemon Emerald", "Pokemon HeartGold", "Monster Hunter: World",
  "Monster Hunter Rise", "Street Fighter 6", "Tekken 8", "Mortal Kombat 1", "Guilty Gear Strive", "Dragon Ball FighterZ", "Super Smash Bros. Melee",
  "Rocket League", "FIFA 23", "EA Sports FC 24", "NBA 2K24", "Gran Turismo 7", "Forza Horizon 5", "Need for Speed Underground 2",
  "Destiny 2", "Warframe", "Path of Exile", "Diablo IV", "Helldivers 2", "Palworld", "Lethal Company", "Among Us", "Rust", "Phasmophobia",
  "Dead by Daylight", "Hollow Knight", "Celeste", "Hades", "Hades II", "Cuphead", "Dead Cells", "Slay the Spire", "Subnautica", "Portal 2",
  "Half-Life 2", "BioShock", "BioShock Infinite", "Mass Effect 2", "Halo 3", "Halo Infinite", "Gears of War", "Doom Eternal", "Resident Evil 4 Remake",
  "Resident Evil 2 Remake", "Resident Evil Village", "Silent Hill 2", "Alan Wake 2", "Metroid Prime", "Star Wars Jedi: Survivor", "Armored Core VI"
];

// Diverse Subtopics to generate non-repetitive deep trivia
const SUBTOPICS = [
  "Main Characters, Lore & Backstory",
  "Signature Abilities, Powers, Weapons & Magic",
  "Key Plot Arcs, Major Battles & Climax Moments",
  "Antagonists, Villains, Bosses & Rivals",
  "Iconic Quotes, Trivia, Release Year, Studios & Creators",
  "Locations, Maps, Factions & World Geography"
];

/**
 * Clean HTML entity encoding from OpenTDB
 */
function decodeHtmlEntities(str) {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&eacute;/g, "é")
    .replace(/&shy;/g, "");
}

/**
 * Fetch open-source trivia questions from OpenTDB (Category 31 = Anime, Category 15 = Video Games)
 */
async function fetchOpenTDBQuestions(categoryNum, typeStr) {
  console.log(`🌐 [OpenTDB] Fetching open-source trivia for Category ${categoryNum} (${typeStr})...`);
  let importedCount = 0;
  
  for (let i = 0; i < 5; i++) {
    try {
      const res = await axios.get(`https://opentdb.com/api.php?amount=50&category=${categoryNum}&type=multiple`);
      if (res.data?.results && Array.isArray(res.data.results)) {
        for (const item of res.data.results) {
          const qText = decodeHtmlEntities(item.question);
          const correct = decodeHtmlEntities(item.correct_answer);
          const incorrects = (item.incorrect_answers || []).map(decodeHtmlEntities);
          
          if (incorrects.length !== 3 || !correct || !qText) continue;
          
          // Shuffle options
          const allOptions = [correct, ...incorrects].sort(() => Math.random() - 0.5);

          const isDup = await QuizQuestion.findOne({ question: qText });
          if (!isDup) {
            await QuizQuestion.create({
              type: typeStr,
              title: typeStr === "anime" ? "Anime Lore" : "Gaming Lore",
              category: decodeHtmlEntities(item.category),
              question: qText,
              options: allOptions,
              correctAnswer: correct,
              difficulty: item.difficulty || "medium",
              explanation: `Official trivia from ${decodeHtmlEntities(item.category)}.`,
              source: "opentdb",
              tags: [typeStr, item.difficulty, "Trivia"].filter(Boolean)
            });
            importedCount++;
          }
        }
      }
      // Brief pause to respect API rate limits
      await new Promise((r) => setTimeout(r, 1200));
    } catch (err) {
      console.warn(`[OpenTDB] Batch ${i + 1} notice:`, err.message);
      break;
    }
  }
  
  console.log(`✅ [OpenTDB] Added ${importedCount} verified public questions for ${typeStr}.`);
  return importedCount;
}

/**
 * Run high-speed batch mass generation with company AI
 */
export async function runMassQuestionGeneration({ targetTotal = 30000, concurrency = 3 } = {}) {
  await connectDB();

  let totalQuestions = await QuizQuestion.countDocuments();
  console.log(`🚀 [Mass Generator] Starting. Current questions in DB: ${totalQuestions}. Target: ${targetTotal}+`);

  // Step 1: Ingest OpenTDB public datasets
  try {
    await fetchOpenTDBQuestions(31, "anime");
    await fetchOpenTDBQuestions(15, "game");
  } catch (e) {
    console.warn("OpenTDB ingestion notice:", e.message);
  }

  // Combine database registered titles with top catalog
  const dbAnime = await AnimeTitle.find().distinct("title");
  const dbGames = await GameTitle.find().distinct("title");

  const allAnimeTitles = Array.from(new Set([...POPULAR_ANIME_CATALOG, ...dbAnime]));
  const allGameTitles = Array.from(new Set([...POPULAR_GAME_CATALOG, ...dbGames]));

  console.log(`📋 [Catalog] Ready with ${allAnimeTitles.length} Anime titles and ${allGameTitles.length} Game titles.`);

  // Build target queue of generation tasks
  const generationTasks = [];

  for (const title of allAnimeTitles) {
    for (const subtopic of SUBTOPICS) {
      generationTasks.push({
        type: "anime",
        title,
        category: subtopic,
        count: 5,
      });
    }
  }

  for (const title of allGameTitles) {
    for (const subtopic of SUBTOPICS) {
      generationTasks.push({
        type: "game",
        title,
        category: subtopic,
        count: 5,
      });
    }
  }

  console.log(`⚡ [Mass Generator] Total task queue created: ${generationTasks.length} batch prompts.`);

  // Worker Queue Runner with concurrency
  let taskIndex = 0;
  let addedInThisRun = 0;

  async function worker(workerId) {
    while (taskIndex < generationTasks.length) {
      const currentTask = generationTasks[taskIndex++];
      if (!currentTask) break;

      totalQuestions = await QuizQuestion.countDocuments();
      if (totalQuestions >= targetTotal) {
        console.log(`🎯 [Target Reached] Total questions reached ${totalQuestions}! Stopping worker ${workerId}.`);
        break;
      }

      const existingForTitleAndTopic = await QuizQuestion.countDocuments({
        title: currentTask.title,
        tags: currentTask.category,
      });

      if (existingForTitleAndTopic >= 10) {
        continue;
      }

      console.log(
        `[Worker ${workerId}] Generating 10 Qs for ${currentTask.type.toUpperCase()}: "${currentTask.title}" (${currentTask.category})... (Total in DB: ${totalQuestions})`
      );

      try {
        const questions = await generateAIQuestions({
          title: currentTask.title,
          type: currentTask.type,
          count: currentTask.count,
          category: currentTask.category,
        });

        if (Array.isArray(questions) && questions.length > 0) {
          let batchSaved = 0;
          for (const q of questions) {
            const isDup = await QuizQuestion.findOne({
              title: currentTask.title,
              question: q.question,
            });

            if (!isDup) {
              let titleRef = null;
              let titleRefModel = currentTask.type === "anime" ? "AnimeTitle" : "GameTitle";

              if (currentTask.type === "anime") {
                let aDoc = await AnimeTitle.findOne({ title: currentTask.title });
                if (!aDoc) {
                  aDoc = await AnimeTitle.create({
                    title: currentTask.title,
                    genres: [currentTask.category || "Anime"],
                    aliases: [currentTask.title],
                  });
                }
                titleRef = aDoc._id;
              } else {
                let gDoc = await GameTitle.findOne({ title: currentTask.title });
                if (!gDoc) {
                  gDoc = await GameTitle.create({
                    title: currentTask.title,
                    genres: [currentTask.category || "Gaming"],
                    aliases: [currentTask.title],
                  });
                }
                titleRef = gDoc._id;
              }

              await QuizQuestion.create({
                ...q,
                titleRef,
                titleRefModel,
                tags: [currentTask.title, currentTask.category, currentTask.type],
              });
              batchSaved++;
              addedInThisRun++;
            }
          }
          console.log(
            `✨ [Worker ${workerId}] Saved ${batchSaved} Qs for "${currentTask.title}". (+${addedInThisRun} this session)`
          );
        }
      } catch (err) {
        console.warn(`⚠️ [Worker ${workerId}] Generation notice for "${currentTask.title}":`, err.message);
        // Small cooldown before retry
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  // Launch concurrent workers
  console.log(`🚀 Launching ${concurrency} parallel AI generation workers...`);
  const workerPromises = [];
  for (let i = 1; i <= concurrency; i++) {
    workerPromises.push(worker(i));
  }

  await Promise.all(workerPromises);

  const finalCount = await QuizQuestion.countDocuments();
  console.log(`🎉 [Mass Generation Complete] Session finished! Total questions in database: ${finalCount}`);
  return { addedInThisRun, finalCount };
}

if (process.argv[1]?.endsWith("massQuestionGenerator.js")) {
  runMassQuestionGeneration({ targetTotal: 35000, concurrency: 3 })
    .then((res) => {
      console.log("Mass seeding complete:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Mass seeding error:", err);
      process.exit(1);
    });
}

export default runMassQuestionGeneration;
