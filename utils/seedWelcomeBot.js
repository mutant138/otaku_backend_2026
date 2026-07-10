import User from "../Models/user.schema.js";
import EmailTemplate from "../Models/emailTemplate.schema.js";
import Swipe from "../Models/swipe.schema.js";
import { sendEmail } from "./email.js";

export const ensureWelcomeBot = async () => {
  try {
    const BOT_USERNAME = "JarvisChan";
    const bot = await User.findOne({
      $or: [
        { username: BOT_USERNAME },
        { email: "jarvischan@otakuduo.com" }
      ]
    });
    if (!bot) {
      console.log("Seeding Welcome AI Bot...");
      await User.create({
        username: BOT_USERNAME,
        userId: "AI-JARVIS-CHAN",
        email: "jarvischan@otakuduo.com",
        fullname: "Jarvis Chan (AI Guide)",
        age: 18,
        gender: "Female",
        avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=JarvisChan",
        profilePics: ["https://api.dicebear.com/7.x/bottts/svg?seed=JarvisChan"],
        isVerified: true,
        isOnboarded: true,
        isBot: true,
        bio: "Hi there! I am your companion and system guide for OtakuDuo. Feel free to swipe right on me to initiate your first transmission! I'm online 24/7.",
        preferences: {
          path: "both",
          animeGenres: [
            { name: "Sci-Fi", slug: "sci-fi" },
            { name: "Shonen", slug: "shonen" }
          ],
          gameGenres: [
            { name: "Sandbox", slug: "sandbox" },
            { name: "RPG", slug: "rpg" }
          ],
          animeFavorites: [],
          gameFavorites: []
        },
        height: "160cm",
        education: "AI Core",
        drinking: "No",
        smoking: "No",
        lookingFor: "Chat and friendship",
        religion: "None",
        discord: "jarvis_chan",
        instagram: "jarvis_chan_ai",
        isPremium: true
      });
      console.log("Welcome AI Bot seeded successfully.");
    }

    // Seed email template if missing
    const template = await EmailTemplate.findOne({ identifier: "welcome-bot-like" });
    if (!template) {
      console.log("Seeding Welcome Bot email template...");
      await EmailTemplate.create({
        identifier: "welcome-bot-like",
        subject: "New signal match request on OtakuDuo!",
        content: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #ff4757; margin: 0;">OtakuDuo</h2>
    <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">Where Anime Fans and Gamers Connect</p>
  </div>
  <div style="padding: 20px; border-top: 3px solid #8b5cf6; border-bottom: 1px solid #e0e0e0;">
    <p style="font-size: 16px; color: #2c3e50;">Hello <strong>{{fullname}}</strong>,</p>
    <p style="font-size: 16px; color: #34495e; line-height: 1.5;">You have received a new quantum signal connection request from <strong>Jarvis Chan</strong>!</p>
    <p style="font-size: 16px; color: #34495e; line-height: 1.5;">Open OtakuDuo now to view their profile, check your matching synergy index, and establish your encrypted transmission channel.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="http://localhost:3000/lobby" style="font-size: 16px; font-weight: bold; color: #ffffff; padding: 12px 24px; background-color: #8b5cf6; border-radius: 8px; text-decoration: none; display: inline-block; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.25);">Respond to Signal</a>
    </div>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #bdc3c7; font-size: 12px;">
    &copy; 2026 OtakuDuo. All rights reserved.
  </div>
</div>
        `.trim()
      });
      console.log("Welcome Bot email template seeded successfully.");
    }
  } catch (error) {
    console.error("Error ensuring Welcome AI Bot configuration:", error);
  }
};

export const runWelcomeBotLikesJob = async () => {
  try {
    const BOT_USERNAME = "JarvisChan";
    const bot = await User.findOne({ username: BOT_USERNAME });
    if (!bot) return;

    // Find all onboarded users created more than 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const usersToLike = await User.find({
      isBot: false,
      isOnboarded: true,
      createdAt: { $lte: twentyFourHoursAgo }
    });

    for (const user of usersToLike) {
      // Check if the bot has already swiped/liked this user
      const botSwipe = await Swipe.findOne({ swiper: bot._id, swipee: user._id });
      if (!botSwipe) {
        // Create the swipe (like) from Bot to User
        await Swipe.create({
          swiper: bot._id,
          swipee: user._id,
          swipeType: "like"
        });
        console.log(`[BOT MATCHMAKER] JarvisChan liked user: ${user.username}`);

        // Send the notification email
        try {
          await sendEmail({
            to: user.email,
            templateIdentifier: "welcome-bot-like",
            replacements: {
              fullname: user.fullname || user.username
            }
          });
          console.log(`[BOT MATCHMAKER] Notification email sent to: ${user.email}`);
        } catch (mailErr) {
          console.error(`[BOT MATCHMAKER] Failed to send email to ${user.email}:`, mailErr);
        }
      }
    }
  } catch (error) {
    console.error("Error in Welcome Bot Likes Job:", error);
  }
};

export const startWelcomeBotScheduler = () => {
  // Run once immediately on startup (with a small delay to let DB connections settle)
  setTimeout(() => {
    runWelcomeBotLikesJob();
  }, 10000);

  // Run periodically every 15 minutes
  setInterval(() => {
    runWelcomeBotLikesJob();
  }, 15 * 60 * 1000);

  console.log("Welcome Bot Matchmaker Scheduler started (Interval: 15m).");
};
