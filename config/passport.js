import passport from "passport";
import { Strategy as CustomStrategy } from "passport-custom";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import User from "../Models/user.schema.js";
import { generateUserId } from "../utils/jwt.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ANIME_PREFIXES = [
  "Shinobi", "Saiyan", "Ghoul", "Titan", "Jujutsu", "Hokage", "Bankai", "Tsundere", "Yandere", "Senpai",
  "Kouhai", "Otaku", "Weeb", "Chibi", "Neko", "Kawaii", "Shounen", "Shojo", "Isekai", "Nakama",
  "Jutsu", "Sharingan", "Rasengan", "Kamehameha", "DeathNote", "Geass", "StrawHat", "Goku", "Naruto", "Luffy"
];

const GAME_SUFFIXES = [
  "Gamer", "Pixel", "Glitch", "Mage", "Rogue", "Paladin", "Warrior", "Healer", "Sniper", "Camper",
  "Noob", "Pro", "Speedrunner", "Controller", "Joystick", "Quest", "Boss", "NPC", "Frag", "Guild",
  "Loot", "Spawn", "Respawn", "Mana", "Stealth", "Modder", "Arcade", "Console", "Steam", "Xbox"
];

const generateRandomUsername = async () => {
  let isUnique = false;
  let username = "";
  while (!isUnique) {
    const prefix = ANIME_PREFIXES[Math.floor(Math.random() * ANIME_PREFIXES.length)];
    const suffix = GAME_SUFFIXES[Math.floor(Math.random() * GAME_SUFFIXES.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    username = `${prefix}${suffix}${randomNum}`;
    const existing = await User.findOne({ username });
    if (!existing) {
      isUnique = true;
    }
  }
  return username;
};

passport.use(
  "google-id-token",
  new CustomStrategy(async (req, done) => {
    try {
      const { credential, accessToken, referredBy } = req.body;
      let email, googleId, name, picture;

      if (accessToken) {
        // Fetch user info directly from Google using Access Token
        const response = await axios.get(
          `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`
        );
        const payload = response.data;
        if (!payload || !payload.email) {
          return done(null, false, { message: "Invalid Access Token payload" });
        }
        email = payload.email;
        googleId = payload.sub;
        name = payload.name;
        picture = payload.picture;
      } else if (credential) {
        // Verify ID Token with Google OAuth client
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
          return done(null, false, { message: "Invalid ID Token payload" });
        }
        email = payload.email;
        googleId = payload.sub;
        name = payload.name;
        picture = payload.picture;
      } else {
        return done(null, false, { message: "No Google token provided" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      let user = await User.findOne({ email: normalizedEmail });

      if (user) {
        let updated = false;
        if (!user.googleId) {
          user.googleId = googleId;
          updated = true;
        }
        if (picture && !user.avatar) {
          user.avatar = picture;
          updated = true;
        }
        if (!user.isVerified) {
          user.isVerified = true;
          updated = true;
        }
        if (!user.userId) {
          user.userId = await generateUserId();
          updated = true;
        }
        if (updated) {
          await user.save();
        }
      } else {
        const generatedUsername = await generateRandomUsername();
        const newUserId = await generateUserId();
        user = new User({
          username: generatedUsername,
          userId: newUserId,
          email: normalizedEmail,
          fullname: name ? name.trim() : "",
          avatar: picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`,
          googleId: googleId,
          isVerified: true,
          referredBy: referredBy ? referredBy.trim() : undefined,
        });

        await user.save();

        // Award synergy to referrer immediately since OAuth is auto-verified
        if (referredBy) {
          const referrer = await User.findOne({ userId: referredBy.trim() });
          if (referrer) {
            referrer.synergy = (referrer.synergy || 0) + 5;
            await referrer.save();
          }
        }
      }

      return done(null, user);
    } catch (err) {
      console.error("Passport Custom Google strategy error:", err);
      return done(err);
    }
  })
);

export default passport;
