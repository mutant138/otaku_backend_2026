import mongoose from "mongoose";
import dotenv from "dotenv";
import connectDB from "./db.js";
import AnimeCategory from "./Models/animeCategory.schema.js";
import GameCategory from "./Models/gameCategory.schema.js";
import AnimeTitle from "./Models/animeTitle.schema.js";
import GameTitle from "./Models/gameTitle.schema.js";
import Country from "./Models/country.schema.js";
import State from "./Models/state.schema.js";
import City from "./Models/city.schema.js";
import EmailTemplate from "./Models/emailTemplate.schema.js";

dotenv.config();

const ANIME_GENRES_DATA = [
  { name: "Shonen", slug: "shonen", description: "Action & Adventure", icon: "🔥" },
  { name: "Seinen", slug: "seinen", description: "Mature & Psychological", icon: "🧠" },
  { name: "Isekai", slug: "isekai", description: "Fantasy Rebirth", icon: "🌀" },
  { name: "Slice of Life", slug: "slice-of-life", description: "Relaxing & Comedy", icon: "🌸" },
  { name: "Romance", slug: "romance", description: "Drama & Love Stories", icon: "💖" },
  { name: "Sci-Fi", slug: "sci-fi", description: "Science Fiction (Sci-Fi)", icon: "🚀" },
];

const GAME_GENRES_DATA = [
  { name: "RPG", slug: "rpg", description: "Role-Playing Worlds", icon: "⚔️" },
  { name: "FPS", slug: "fps", description: "First-Person Combat", icon: "🎯" },
  { name: "MOBA", slug: "moba", description: "Strategic Team Arena", icon: "⚔️" },
  { name: "Fighting", slug: "fighting", description: "1v1 Fighting Action", icon: "👊" },
  { name: "Sandbox", slug: "sandbox", description: "Creative & Co-operative", icon: "⛏️" },
  { name: "Battle Royale", slug: "battle-royale", description: "Last Man Standing", icon: "🪂" },
];

const ANIME_TITLES_DATA = [
  { title: "Solo Leveling", image: "", categorySlugs: ["shonen", "isekai"] },
  { title: "Demon Slayer", image: "", categorySlugs: ["shonen"] },
  { title: "Naruto", image: "", categorySlugs: ["shonen"] },
  { title: "Jujutsu Kaisen", image: "", categorySlugs: ["shonen", "seinen"] },
  { title: "Attack on Titan", image: "", categorySlugs: ["shonen", "seinen"] },
  { title: "One Piece", image: "", categorySlugs: ["shonen"] },
  { title: "Frieren", image: "", categorySlugs: ["slice-of-life", "isekai"] },
  { title: "Chainsaw Man", image: "", categorySlugs: ["shonen", "seinen"] },
];

const GAME_TITLES_DATA = [
  { title: "Elden Ring", image: "", categorySlugs: ["rpg"] },
  { title: "Valorant", image: "", categorySlugs: ["fps"] },
  { title: "Genshin Impact", image: "", categorySlugs: ["rpg", "sandbox"] },
  { title: "Cyberpunk 2077", image: "", categorySlugs: ["rpg"] },
  { title: "League of Legends", image: "", categorySlugs: ["moba"] },
  { title: "Counter-Strike 2", image: "", categorySlugs: ["fps"] },
  { title: "Tekken 8", image: "", categorySlugs: ["fighting"] },
  { title: "Minecraft", image: "", categorySlugs: ["sandbox"] },
];

const LOCATION_DATA = [
  {
    name: "India",
    flag: "🇮🇳",
    code: "IN",
    states: [
      {
        name: "Tamil Nadu",
        cities: ["Chennai", "Coimbatore", "Madurai"]
      },
      {
        name: "Karnataka",
        cities: ["Bengaluru", "Mysore", "Mangalore"]
      },
      {
        name: "Maharashtra",
        cities: ["Mumbai", "Pune", "Nagpur"]
      }
    ]
  },
  {
    name: "United States",
    flag: "🇺🇸",
    code: "US",
    states: [
      {
        name: "California",
        cities: ["Los Angeles", "San Francisco", "San Diego"]
      },
      {
        name: "New York",
        cities: ["New York City", "Buffalo", "Rochester"]
      },
      {
        name: "Texas",
        cities: ["Houston", "Austin", "Dallas"]
      }
    ]
  },
  {
    name: "Japan",
    flag: "🇯🇵",
    code: "JP",
    states: [
      {
        name: "Tokyo",
        cities: ["Shibuya", "Shinjuku", "Akihabara"]
      },
      {
        name: "Osaka",
        cities: ["Osaka City", "Sakai", "Higashiosaka"]
      },
      {
        name: "Kyoto",
        cities: ["Kyoto City", "Uji", "Kameoka"]
      }
    ]
  },
  {
    name: "United Kingdom",
    flag: "🇬🇧",
    code: "GB",
    states: [
      {
        name: "England",
        cities: ["London", "Manchester", "Birmingham"]
      },
      {
        name: "Scotland",
        cities: ["Edinburgh", "Glasgow", "Aberdeen"]
      }
    ]
  },
  {
    name: "Canada",
    flag: "🇨🇦",
    code: "CA",
    states: [
      {
        name: "Ontario",
        cities: ["Toronto", "Ottawa", "Mississauga"]
      },
      {
        name: "Quebec",
        cities: ["Montreal", "Quebec City", "Laval"]
      }
    ]
  }
];

const seed = async () => {
  try {
    await connectDB();
    console.log("Connected to DB, starting seed...");

    // Clear existing data
    console.log("Clearing existing categories, titles, and locations...");
    await AnimeCategory.deleteMany({});
    await GameCategory.deleteMany({});
    await AnimeTitle.deleteMany({});
    await GameTitle.deleteMany({});
    await Country.deleteMany({});
    await State.deleteMany({});
    await City.deleteMany({});
    await EmailTemplate.deleteMany({});

    // Seed Locations
    console.log("Seeding Location Data...");
    for (const cData of LOCATION_DATA) {
      const countryObj = await Country.create({
        name: cData.name,
        flag: cData.flag,
        code: cData.code
      });

      for (const sData of cData.states) {
        const stateObj = await State.create({
          name: sData.name,
          country: countryObj._id
        });

        for (const cityName of sData.cities) {
          await City.create({
            name: cityName,
            state: stateObj._id
          });
        }
      }
    }
    console.log("Locations seeded successfully!");

    // Seed Anime Categories
    console.log("Seeding Anime Categories...");
    const animeCats = await AnimeCategory.insertMany(ANIME_GENRES_DATA);
    const animeCatMap = {};
    animeCats.forEach(c => {
      animeCatMap[c.slug] = c._id;
    });

    // Seed Game Categories
    console.log("Seeding Game Categories...");
    const gameCats = await GameCategory.insertMany(GAME_GENRES_DATA);
    const gameCatMap = {};
    gameCats.forEach(c => {
      gameCatMap[c.slug] = c._id;
    });

    // Prepare Anime Titles
    const animeTitlesToInsert = ANIME_TITLES_DATA.map(t => ({
      title: t.title,
      image: t.image,
      popularity: Math.floor(Math.random() * 1000) + 100,
      categories: t.categorySlugs.map(slug => animeCatMap[slug]).filter(Boolean),
    }));

    // Prepare Game Titles
    const gameTitlesToInsert = GAME_TITLES_DATA.map(t => ({
      title: t.title,
      image: t.image,
      popularity: Math.floor(Math.random() * 1000) + 100,
      categories: t.categorySlugs.map(slug => gameCatMap[slug]).filter(Boolean),
    }));

    // Seed Titles
    console.log("Seeding Anime Titles...");
    await AnimeTitle.insertMany(animeTitlesToInsert);

    console.log("Seeding Game Titles...");
    await GameTitle.insertMany(gameTitlesToInsert);

    console.log("Seeding Email Templates...");
    await EmailTemplate.create({
      identifier: "otp-verification",
      subject: "Verify your OtakuDuo account",
      content: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #ff4757; margin: 0;">OtakuDuo</h2>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">Where Anime Fans and Gamers Connect</p>
  </div>
  <div style="padding: 20px; border-top: 3px solid #ff4757; border-bottom: 1px solid #e0e0e0;">
    <p style="font-size: 16px; color: #2c3e50;">Hello <strong>{{fullname}}</strong>,</p>
    <p style="font-size: 16px; color: #34495e; line-height: 1.5;">Thank you for registering on OtakuDuo! Please use the following One-Time Password (OTP) to verify your account. This code is valid for 10 minutes.</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff4757; padding: 10px 20px; background-color: #ffeef0; border-radius: 5px; border: 1px dashed #ff4757;">{{otp}}</span>
    </div>
    <p style="font-size: 14px; color: #7f8c8d; line-height: 1.5;">If you did not request this, please ignore this email.</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #bdc3c7; font-size: 12px;">
    &copy; 2026 OtakuDuo. All rights reserved.
  </div>
</div>
      `.trim()
    });

    await EmailTemplate.create({
      identifier: "forgot-password",
      subject: "Reset your OtakuDuo password",
      content: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #ff4757; margin: 0;">OtakuDuo</h2>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">Where Anime Fans and Gamers Connect</p>
  </div>
  <div style="padding: 20px; border-top: 3px solid #ff4757; border-bottom: 1px solid #e0e0e0;">
    <p style="font-size: 16px; color: #2c3e50;">Hello <strong>{{fullname}}</strong>,</p>
    <p style="font-size: 16px; color: #34495e; line-height: 1.5;">We received a request to reset the password for your OtakuDuo account. Please use the following One-Time Password (OTP) to complete the reset. This code is valid for 5 minutes.</p>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff4757; padding: 10px 20px; background-color: #ffeef0; border-radius: 5px; border: 1px dashed #ff4757;">{{otp}}</span>
    </div>
    <p style="font-size: 14px; color: #7f8c8d; line-height: 1.5;">If you did not request this, please ignore this email.</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #bdc3c7; font-size: 12px;">
    &copy; 2026 OtakuDuo. All rights reserved.
  </div>
</div>
      `.trim()
    });

    console.log("Database seeded successfully!");
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    mongoose.connection.close();
    process.exit(1);
  }
};

seed();
