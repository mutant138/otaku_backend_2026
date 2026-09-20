import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "../db.js";
import { AnimeTitle, GameTitle, AnimeCategory, GameCategory, QuizQuestion } from "../Models/index.js";
import { generateAIQuestions } from "./aiQuestionGenerator.js";

dotenv.config();

// Curated high-yield starter questions for instant population & verification
const curatedStarterQuestions = [
  // Anime - One Piece
  {
    type: "anime",
    title: "One Piece",
    category: "Shonen Action",
    question: "What is the name of Luffy's signature Devil Fruit?",
    options: ["Gomu Gomu no Mi", "Mera Mera no Mi", "Ope Ope no Mi", "Gura Gura no Mi"],
    correctAnswer: "Gomu Gomu no Mi",
    difficulty: "easy",
    explanation: "Monkey D. Luffy ate the Gomu Gomu no Mi (Hito Hito no Mi, Model: Nika).",
    tags: ["One Piece", "Devil Fruit", "Luffy"],
  },
  {
    type: "anime",
    title: "One Piece",
    category: "Shonen Action",
    question: "Who gave Luffy his iconic Straw Hat?",
    options: ["Red-Haired Shanks", "Gol D. Roger", "Monkey D. Garp", "Silvers Rayleigh"],
    correctAnswer: "Red-Haired Shanks",
    difficulty: "easy",
    explanation: "Shanks entrusted Luffy with his straw hat before departing Foosha Village.",
    tags: ["One Piece", "Shanks", "Straw Hat"],
  },
  {
    type: "anime",
    title: "One Piece",
    category: "Shonen Action",
    question: "What is the primary currency used in the One Piece world?",
    options: ["Berries (Beli)", "Zeni", "Ryo", "Credits"],
    correctAnswer: "Berries (Beli)",
    difficulty: "easy",
    explanation: "Beli is the universal currency throughout the Grand Line and Blue Seas.",
    tags: ["One Piece", "World"],
  },
  // Anime - Naruto
  {
    type: "anime",
    title: "Naruto: Shippuden",
    category: "Ninja Adventure",
    question: "Which clan does Sasuke belong to?",
    options: ["Uchiha Clan", "Uzumaki Clan", "Hyuga Clan", "Senju Clan"],
    correctAnswer: "Uchiha Clan",
    difficulty: "easy",
    explanation: "Sasuke is one of the last surviving members of the Uchiha Clan.",
    tags: ["Naruto", "Sasuke", "Uchiha"],
  },
  {
    type: "anime",
    title: "Naruto: Shippuden",
    category: "Ninja Adventure",
    question: "What is the name of the Nine-Tailed Fox sealed inside Naruto?",
    options: ["Kurama", "Gyuki", "Shukaku", "Son Goku"],
    correctAnswer: "Kurama",
    difficulty: "easy",
    explanation: "The Nine-Tails sealed inside Naruto Uzumaki is named Kurama.",
    tags: ["Naruto", "Tailed Beast", "Kurama"],
  },
  {
    type: "anime",
    title: "Naruto: Shippuden",
    category: "Ninja Adventure",
    question: "Who was the creator of the Rasengan technique?",
    options: ["Minato Namikaze", "Jiraiya", "Kakashi Hatake", "Tobirama Senju"],
    correctAnswer: "Minato Namikaze",
    difficulty: "medium",
    explanation: "Minato Namikaze spent three years developing the Rasengan.",
    tags: ["Naruto", "Jutsu", "Minato"],
  },
  // Anime - Attack on Titan
  {
    type: "anime",
    title: "Attack on Titan",
    category: "Dark Fantasy",
    question: "What are the three concentric walls protecting humanity named?",
    options: [
      "Maria, Rose, and Sheena",
      "Sina, Genesis, and Hope",
      "Eldia, Marley, and Paradis",
      "Titan, Scout, and Garrison",
    ],
    correctAnswer: "Maria, Rose, and Sheena",
    difficulty: "easy",
    explanation: "Wall Maria (outer), Wall Rose (middle), and Wall Sheena (inner).",
    tags: ["Attack on Titan", "Lore", "Walls"],
  },
  {
    type: "anime",
    title: "Attack on Titan",
    category: "Dark Fantasy",
    question: "Which Titan power does Eren Yeager inherit from his father Grisha?",
    options: ["Attack Titan & Founding Titan", "Colossal Titan", "Armored Titan", "Beast Titan"],
    correctAnswer: "Attack Titan & Founding Titan",
    difficulty: "medium",
    explanation: "Grisha passed both the Attack Titan and Founding Titan to Eren.",
    tags: ["Attack on Titan", "Eren", "Titans"],
  },
  // Anime - Jujutsu Kaisen
  {
    type: "anime",
    title: "Jujutsu Kaisen",
    category: "Supernatural",
    question: "What is Satoru Gojo's signature Domain Expansion called?",
    options: ["Unlimited Void", "Malevolent Shrine", "Chimera Shadow Garden", "Self-Embodiment of Perfection"],
    correctAnswer: "Unlimited Void",
    difficulty: "easy",
    explanation: "Gojo Satoru's domain expansion is Unlimited Void (Muryōkūsho).",
    tags: ["Jujutsu Kaisen", "Gojo", "Domain Expansion"],
  },
  {
    type: "anime",
    title: "Jujutsu Kaisen",
    category: "Supernatural",
    question: "How many fingers of Ryomen Sukuna exist in total?",
    options: ["20", "10", "15", "8"],
    correctAnswer: "20",
    difficulty: "easy",
    explanation: "Sukuna had four arms, resulting in 20 cursed fingers.",
    tags: ["Jujutsu Kaisen", "Sukuna"],
  },
  // Games - Grand Theft Auto V
  {
    type: "game",
    title: "Grand Theft Auto V",
    category: "Open World",
    question: "What are the names of the three main playable protagonists in GTA V?",
    options: [
      "Michael, Franklin, and Trevor",
      "Niko, Roman, and CJ",
      "Tommy, Claude, and Arthur",
      "Carl, Ryder, and Big Smoke",
    ],
    correctAnswer: "Michael, Franklin, and Trevor",
    difficulty: "easy",
    explanation: "GTA V features Michael De Santa, Franklin Clinton, and Trevor Philips.",
    tags: ["GTA V", "Protagonists", "Rockstar"],
  },
  {
    type: "game",
    title: "Grand Theft Auto V",
    category: "Open World",
    question: "What is the fictional city where GTA V takes place?",
    options: ["Los Santos", "Liberty City", "Vice City", "San Fierro"],
    correctAnswer: "Los Santos",
    difficulty: "easy",
    explanation: "GTA V is set in Los Santos and the surrounding Blaine County.",
    tags: ["GTA V", "Map"],
  },
  // Games - Valorant
  {
    type: "game",
    title: "Valorant",
    category: "Tactical FPS",
    question: "Which Agent has the ultimate ability 'Run It Back' that revives them upon death?",
    options: ["Phoenix", "Jett", "Reyna", "Yoru"],
    correctAnswer: "Phoenix",
    difficulty: "easy",
    explanation: "Phoenix's ultimate (Run It Back) places a marker and restores his life.",
    tags: ["Valorant", "Phoenix", "Abilities"],
  },
  {
    type: "game",
    title: "Valorant",
    category: "Tactical FPS",
    question: "What is the explosive device called that attackers must plant in standard matches?",
    options: ["The Spike", "The Bomb", "The Core", "The Defuser"],
    correctAnswer: "The Spike",
    difficulty: "easy",
    explanation: "In Valorant, attackers plant the Spike to harvest Radianite.",
    tags: ["Valorant", "Objectives"],
  },
  // Games - Elden Ring
  {
    type: "game",
    title: "Elden Ring",
    category: "Action RPG",
    question: "What is the name of the spectral steed given to the Tarnished by Melina?",
    options: ["Torrent", "Roach", "Shadowmere", "Epona"],
    correctAnswer: "Torrent",
    difficulty: "easy",
    explanation: "Torrent is the horned spectral steed summoned using the Spectral Steed Whistle.",
    tags: ["Elden Ring", "Mount", "Torrent"],
  },
  {
    type: "game",
    title: "Elden Ring",
    category: "Action RPG",
    question: "Which demi-god boss is renowned for uttering 'I am Malenia, Blade of Miquella'?",
    options: ["Malenia", "Radahn", "Ranni", "Godrick"],
    correctAnswer: "Malenia",
    difficulty: "easy",
    explanation: "Malenia, Blade of Miquella is one of the most famous bosses in The Lands Between.",
    tags: ["Elden Ring", "Malenia", "Bosses"],
  },
  // Games - Counter-Strike 2
  {
    type: "game",
    title: "Counter-Strike 2",
    category: "Tactical FPS",
    question: "What is the highest-damage sniper rifle that can eliminate an enemy with one body shot in CS2?",
    options: ["AWP", "SSG 08 (Scout)", "SCAR-20", "G3SG1"],
    correctAnswer: "AWP",
    difficulty: "easy",
    explanation: "The AWP (Arctic Warfare Police) delivers fatal single-shot torso damage.",
    tags: ["CS2", "Weapons", "AWP"],
  },
  // Games - League of Legends
  {
    type: "game",
    title: "League of Legends",
    category: "MOBA",
    question: "What is the name of the main competitive 5v5 battle map in League of Legends?",
    options: ["Summoner's Rift", "Howling Abyss", "Twisted Treeline", "Crystal Scar"],
    correctAnswer: "Summoner's Rift",
    difficulty: "easy",
    explanation: "Summoner's Rift is the standard primary battlefield for League of Legends.",
    tags: ["League of Legends", "Summoner's Rift"],
  },
];

/**
 * Seed & Generate Quiz Questions for all Titles using Company Self-Hosted AI
 */
export async function generateAllTriviaQuestions({ maxTitles = 30, questionsPerTitle = 5 } = {}) {
  await connectDB();

  console.log("⚡ [Quiz Seeder] Starting trivia question population...");

  // 1. First seed curated starter questions
  let starterCount = 0;
  for (const q of curatedStarterQuestions) {
    const exists = await QuizQuestion.findOne({
      title: q.title,
      question: q.question,
    });
    if (!exists) {
      await QuizQuestion.create(q);
      starterCount++;
    }
  }
  console.log(`✅ [Quiz Seeder] Seeded ${starterCount} curated starter questions.`);

  // 2. Fetch catalog titles from MongoDB
  const animeTitles = await AnimeTitle.find().limit(maxTitles);
  const gameTitles = await GameTitle.find().limit(maxTitles);

  console.log(
    `📚 [Quiz Seeder] Found ${animeTitles.length} Anime titles and ${gameTitles.length} Game titles to process.`
  );

  let totalAiGenerated = 0;

  // 3. Process Anime Titles
  for (const item of animeTitles) {
    const existingCount = await QuizQuestion.countDocuments({ title: item.title });
    if (existingCount >= 5) {
      console.log(`⏩ [Anime: ${item.title}] Already has ${existingCount} questions. Skipping.`);
      continue;
    }

    const needed = Math.max(questionsPerTitle - existingCount, 3);
    console.log(`🤖 [AI Generating] ${needed} questions for Anime: "${item.title}"...`);

    try {
      const generated = await generateAIQuestions({
        title: item.title,
        type: "anime",
        count: needed,
        category: (item.genres && item.genres[0]) || "Anime",
      });

      for (const q of generated) {
        const isDup = await QuizQuestion.findOne({
          title: item.title,
          question: q.question,
        });
        if (!isDup) {
          await QuizQuestion.create({
            ...q,
            titleRef: item._id,
            titleRefModel: "AnimeTitle",
          });
          totalAiGenerated++;
        }
      }
      console.log(`✨ [Anime: ${item.title}] Successfully added questions.`);
    } catch (err) {
      console.error(`⚠️ [Anime: ${item.title}] AI generation failed: ${err.message}`);
    }
  }

  // 4. Process Game Titles
  for (const item of gameTitles) {
    const existingCount = await QuizQuestion.countDocuments({ title: item.title });
    if (existingCount >= 5) {
      console.log(`⏩ [Game: ${item.title}] Already has ${existingCount} questions. Skipping.`);
      continue;
    }

    const needed = Math.max(questionsPerTitle - existingCount, 3);
    console.log(`🤖 [AI Generating] ${needed} questions for Game: "${item.title}"...`);

    try {
      const generated = await generateAIQuestions({
        title: item.title,
        type: "game",
        count: needed,
        category: (item.genres && item.genres[0]) || "Gaming",
      });

      for (const q of generated) {
        const isDup = await QuizQuestion.findOne({
          title: item.title,
          question: q.question,
        });
        if (!isDup) {
          await QuizQuestion.create({
            ...q,
            titleRef: item._id,
            titleRefModel: "GameTitle",
          });
          totalAiGenerated++;
        }
      }
      console.log(`✨ [Game: ${item.title}] Successfully added questions.`);
    } catch (err) {
      console.error(`⚠️ [Game: ${item.title}] AI generation failed: ${err.message}`);
    }
  }

  const finalTotal = await QuizQuestion.countDocuments();
  console.log(`🎉 [Quiz Seeder] Finished! Added ${totalAiGenerated} new AI questions. Total in DB: ${finalTotal}`);
  return { starterCount, totalAiGenerated, finalTotal };
}

// Run directly from CLI if executed directly
if (process.argv[1]?.endsWith("generateTriviaQuestions.js")) {
  generateAllTriviaQuestions()
    .then((res) => {
      console.log("Seeding complete:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    });
}

export default generateAllTriviaQuestions;
