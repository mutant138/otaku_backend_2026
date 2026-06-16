import User from "../Models/user.schema.js";
import Swipe from "../Models/swipe.schema.js";
import passport from "passport";
import Message from "../Models/message.schema.js";
import axios from "axios";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { generateToken, generateUserId } from "../utils/jwt.js";
import AnimeCategory from "../Models/animeCategory.schema.js";
import GameCategory from "../Models/gameCategory.schema.js";
import AnimeTitle from "../Models/animeTitle.schema.js";
import GameTitle from "../Models/gameTitle.schema.js";
import Country from "../Models/country.schema.js";
import State from "../Models/state.schema.js";
import City from "../Models/city.schema.js";
import Report from "../Models/report.schema.js";
import Payment from "../Models/payment.schema.js";
import Plan from "../Models/plan.schema.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import Razorpay from "razorpay";
import { sendEmail } from "../utils/email.js";

// Helper to generate a dynamic 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

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

// Helper to generate a unique random username combining anime prefixes & game suffixes
const generateRandomUsername = async () => {
  let isUnique = false;
  let username = "";
  while (!isUnique) {
    const prefix = ANIME_PREFIXES[Math.floor(Math.random() * ANIME_PREFIXES.length)];
    const suffix = GAME_SUFFIXES[Math.floor(Math.random() * GAME_SUFFIXES.length)];
    const randomNum = Math.floor(100 + Math.random() * 900); // 3 digit random number
    username = `${prefix}${suffix}${randomNum}`;
    const existing = await User.findOne({ username });
    if (!existing) {
      isUnique = true;
    }
  }
  return username;
};

/**
 * Generate a new unique username.
 * Route: GET /api/user/generate-username
 */
export const generateUsername = async (req, res) => {
  try {
    const username = await generateRandomUsername();
    return res.status(200).json({ status: true, username });
  } catch (error) {
    console.error("Generate Username Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};


/**
 * Helper to build a standard user response object.
 */
function buildUserResponse(user) {
  let isPremium = user.isPremium || false;
  
  // Auto-expiry check for dynamic subscriptions
  if (user.activeSubscription && user.activeSubscription.expiresAt) {
    const isExpired = new Date(user.activeSubscription.expiresAt) < new Date();
    if (isExpired) {
      isPremium = false;
      if (user.isPremium) {
        user.isPremium = false;
        user.save().catch(err => console.error("Error auto-updating expired subscription:", err));
      }
    }
  }

  return {
    id: user._id,
    userId: user.userId || "",
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    profilePics: user.profilePics || [],
    isVerified: user.isVerified,
    isOnboarded: user.isOnboarded,
    isProfileCompleted: user.isProfileCompleted || false,
    preferences: user.preferences,
    googleLinked: !!user.googleId,
    discordLinked: !!user.discordId,
    fullname: user.fullname || "",
    gender: user.gender || "",
    age: user.age || null,
    location: user.location || "",
    locationDetails: user.locationDetails || null,
    bio: user.bio || "",
    // Referral & Rewards
    synergy: user.synergy || 0,
    referredBy: user.referredBy || "",
    // More About You
    height: user.height || "",
    weight: user.weight || "",
    education: user.education || "",
    drinking: user.drinking || "",
    smoking: user.smoking || "",
    lookingFor: user.lookingFor || "",
    kids: user.kids || "",
    politics: user.politics || "",
    religion: user.religion || "",
    discord: user.discord || "",
    instagram: user.instagram || "",
    complimentsBalance: user.complimentsBalance !== undefined ? user.complimentsBalance : 1,
    extraSwipesBalance: user.extraSwipesBalance || 0,
    superLikesBalance: user.superLikesBalance !== undefined ? user.superLikesBalance : 1,
    isPremium,
    activeSubscription: user.activeSubscription || null,
  };
}

function buildPublicUserResponse(user) {
  if (!user) return null;
  
  let isPremium = user.isPremium || false;
  if (user.activeSubscription && user.activeSubscription.expiresAt) {
    const isExpired = new Date(user.activeSubscription.expiresAt) < new Date();
    if (isExpired) {
      isPremium = false;
    }
  }

  return {
    id: user._id,
    userId: user.userId || "",
    username: user.username,
    avatar: user.avatar,
    profilePics: user.profilePics || [],
    isVerified: user.isVerified || false,
    fullname: user.fullname || "",
    gender: user.gender || "",
    age: user.age || null,
    location: user.location || "",
    bio: user.bio || "",
    preferences: user.preferences || {
      path: "both",
      animeGenres: [],
      gameGenres: [],
      animeFavorites: [],
      gameFavorites: []
    },
    // More About You
    height: user.height || "",
    weight: user.weight || "",
    education: user.education || "",
    drinking: user.drinking || "",
    smoking: user.smoking || "",
    lookingFor: user.lookingFor || "",
    kids: user.kids || "",
    politics: user.politics || "",
    religion: user.religion || "",
    discord: user.discord || "",
    instagram: user.instagram || "",
    synergy: user.synergy || 0,
    isPremium
  };
}

/**
 * Check if email is already registered and if it has a password set.
 * The frontend uses this to decide: show login form or signup form.
 * Route: POST /api/user/check-email
 */
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      return res.status(200).json({
        exists: true,
        hasPassword: !!user.password,
        providers: {
          google: !!user.googleId,
          discord: !!user.discordId,
        },
      });
    }

    return res.status(200).json({ exists: false });
  } catch (error) {
    console.error("Check Email Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Register a new user (email signup).
 * Stores a hardcoded OTP and waits for verification before issuing a token.
 * Also handles linking a password to an existing OAuth-only account.
 * Route: POST /api/user/register
 */
export const registerUser = async (req, res) => {
  try {
    const { fullname, email, password, referredBy } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      // User exists via OAuth but has no local password — link it
      if (!user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.fullname = fullname.trim();
        user.username = await generateRandomUsername();
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 min
        if (referredBy) {
          user.referredBy = referredBy.trim();
        }
        await user.save();

        // Send OTP verification email
        try {
          await sendEmail({
            to: user.email,
            templateIdentifier: "otp-verification",
            replacements: {
              fullname: user.fullname,
              otp: otp
            }
          });
        } catch (mailErr) {
          console.error("Failed to send verification email (OAuth link):", mailErr);
        }

        return res.status(200).json({
          message: "OTP sent to your email for verification.",
          requiresOtp: true,
          email: user.email,
          otpExpiresAt: user.otpExpiresAt.toISOString(),
        });
      }

      // User exists but is NOT verified — allow them to update details and re-request OTP
      if (!user.isVerified) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.fullname = fullname.trim();
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 min
        if (referredBy) {
          user.referredBy = referredBy.trim();
        }
        await user.save();

        // Send OTP verification email
        try {
          await sendEmail({
            to: user.email,
            templateIdentifier: "otp-verification",
            replacements: {
              fullname: user.fullname,
              otp: otp
            }
          });
        } catch (mailErr) {
          console.error("Failed to send verification email (Re-registration):", mailErr);
        }

        return res.status(200).json({
          message: "OTP sent to your email for verification.",
          status: true,
          email: user.email,
          otpExpiresAt: user.otpExpiresAt.toISOString(),
        });
      }

      return res.status(400).json({ message: "Email is already in use" });
    }

    // Create new user with hashed password + OTP pending verification
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Generate user Id
    const userId = await generateUserId();
    const generatedUsername = await generateRandomUsername();
    const otp = generateOTP();

    user = new User({
      username: generatedUsername,
      fullname: fullname.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      userId: userId,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`,
      otp: otp,
      otpExpiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3 min
      referredBy: referredBy ? referredBy.trim() : undefined,
    });

    await user.save();

    // Send OTP verification email
    try {
      await sendEmail({
        to: user.email,
        templateIdentifier: "otp-verification",
        replacements: {
          fullname: user.fullname,
          otp: otp
        }
      });
    } catch (mailErr) {
      console.error("Failed to send verification email (Registration):", mailErr);
    }

    return res.status(201).json({
      message: "OTP sent to your email for verification.",
      status: true,
      email: user.email,
      otpExpiresAt: user.otpExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Verify the OTP submitted by the user after signup.
 * On success, marks the user as verified and returns a JWT token.
 * Route: POST /api/user/verify-otp
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.otp) {
      return res.status(400).json({ message: "No OTP was requested for this account" });
    }

    // Check expiry
    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Compare OTP
    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Generate user Id if not exists
    let userId;
    if(!user.userId){
     userId = await generateUserId();
    }
    
    const wasVerified = user.isVerified;

    // OTP verified — mark user as verified, clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    !user.userId && (user.userId = userId);
    await user.save();

    // Award synergy to referrer upon successful verification
    if (!wasVerified && user.referredBy) {
      const referrer = await User.findOne({ userId: user.referredBy });
      if (referrer) {
        referrer.synergy = (referrer.synergy || 0) + 5;
        await referrer.save();
      }
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      message: "Email verified successfully",
      user: buildUserResponse(user),
      token,
      status: true,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Resend the OTP to a user's email.
 * Route: POST /api/user/resend-otp
 */
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email is already verified. Please log in." });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
    await user.save();

    // Send OTP verification email
    try {
      await sendEmail({
        to: user.email,
        templateIdentifier: "otp-verification",
        replacements: {
          fullname: user.fullname,
          otp: otp
        }
      });
    } catch (mailErr) {
      console.error("Failed to send verification email (Resend):", mailErr);
    }

    return res.status(200).json({
      status: true,
      message: "OTP resent successfully to your email.",
      email: user.email,
      otpExpiresAt: user.otpExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Log in a user locally with email/password.
 * Route: POST /api/user/login
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Account exists via OAuth only — no local password set
    if (!user.password) {
      const providers = [];
      if (user.googleId) providers.push("Google");
      if (user.discordId) providers.push("Discord");

      return res.status(400).json({
        message: `This account is linked with ${providers.join(" or ") || "social login"}. Please sign in using your social account, or set a password first.`,
        oauthOnly: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if the user is verified; if not, do OTP verification
    if (!user.isVerified) {
      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes
      await user.save();

      // Send verification email
      try {
        await sendEmail({
          to: user.email,
          templateIdentifier: "otp-verification",
          replacements: {
            fullname: user.fullname,
            otp: otp
          }
        });
      } catch (mailErr) {
        console.error("Failed to send OTP verification email during login:", mailErr);
      }

      return res.status(200).json({
        message: "Your email is not verified. OTP sent to your email for verification.",
        requiresOtp: true,
        email: user.email,
        otpExpiresAt: user.otpExpiresAt.toISOString(),
      });
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      message: "Login successful",
      user: buildUserResponse(user),
      token,
      status: true,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Handle Google and Discord OAuth sign-in / sign-up.
 * Route: POST /api/user/oauth
 * 
 * Imports Used:
 * - User (from ../Models/user.schema.js)
 * - passport (from passport)
 * - axios (from axios)
 * - generateToken, generateUserId (from ../utils/jwt.js)
 * - buildUserResponse (local helper function)
 * - generateRandomUsername (local helper function)
 */
export const oauthLoginOrSignup = async (req, res, next) => {
  try {
    const { provider } = req.body;

    if (provider === "google") {
      passport.authenticate("google-id-token", { session: false }, async (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ status: false, message: info?.message || "Google Authentication failed" });
        }

        const token = generateToken(user._id);
        return res.status(200).json({
          status: true,
          message: "Google login successful",
          user: buildUserResponse(user),
          token,
        });
      })(req, res, next);
      
    } else if (provider === "discord") {
      let { email, username, providerId, avatar, referredBy, code, redirectUri } = req.body;

      if (code) {
        try {
          // 1. Exchange authorization code for access token
          const tokenResponse = await axios.post(
            "https://discord.com/api/oauth2/token",
            new URLSearchParams({
              client_id: process.env.DISCORD_CLIENT_ID,
              client_secret: process.env.DISCORD_CLIENT_SECRET,
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri || "http://localhost:3000",
            }),
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );

          const { access_token } = tokenResponse.data;

          // 2. Fetch user profile from Discord
          const userResponse = await axios.get("https://discord.com/api/users/@me", {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          const discordUser = userResponse.data;
          email = discordUser.email;
          username = discordUser.username;
          providerId = discordUser.id;
          avatar = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || "0", 10) % 5}.png`;

          if (!email) {
            return res.status(400).json({ status: false, message: "Discord account must have a verified email address." });
          }
        } catch (exchangeErr) {
          console.error("Discord exchange error details:", exchangeErr.response?.data || exchangeErr.message);
          return res.status(401).json({ status: false, message: "Failed to authenticate with Discord" });
        }
      }

      if (!email || !providerId) {
        return res.status(400).json({ status: false, message: "Email and provider ID are required for Discord OAuth" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      let user = await User.findOne({ email: normalizedEmail });

      if (user) {
        let updated = false;
        if (!user.discordId) {
          user.discordId = providerId;
          updated = true;
        }
        if (avatar && !user.avatar) {
          user.avatar = avatar;
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
        if (updated) await user.save();
      } else {
        const generatedUsername = await generateRandomUsername();
        const newUserId = await generateUserId();
        user = new User({
          username: generatedUsername,
          userId: newUserId,
          email: normalizedEmail,
          fullname: username ? username.trim() : "",
          avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`,
          discordId: providerId,
          isVerified: true,
          referredBy: referredBy ? referredBy.trim() : undefined,
        });

        await user.save();

        if (referredBy) {
          const referrer = await User.findOne({ userId: referredBy.trim() });
          if (referrer) {
            referrer.synergy = (referrer.synergy || 0) + 5;
            await referrer.save();
          }
        }
      }

      const token = generateToken(user._id);
      return res.status(200).json({
        status: true,
        message: "Discord login successful",
        user: buildUserResponse(user),
        token,
      });
    } else {
      return res.status(400).json({ status: false, message: "Invalid OAuth provider" });
    }
  } catch (error) {
    console.error("OAuth Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const onboardUser = async (req, res) => {
  try {
    const { preferences } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }

    if (!preferences || !preferences.path) {
      return res.status(400).json({ status: false, message: "Onboarding preferences are required" });
    }

    // Look up actual documents to denormalize names/slugs/titles
    const [animeGenreDocs, gameGenreDocs, animeFavDocs, gameFavDocs] = await Promise.all([
      AnimeCategory.find({ _id: { $in: preferences.animeGenres || [] } }),
      GameCategory.find({ _id: { $in: preferences.gameGenres || [] } }),
      AnimeTitle.find({ _id: { $in: preferences.animeFavorites || [] } }),
      GameTitle.find({ _id: { $in: preferences.gameFavorites || [] } }),
    ]);

    user.preferences = {
      path: preferences.path,
      animeGenres: animeGenreDocs.map(doc => ({ ref: doc._id, name: doc.name, slug: doc.slug })),
      gameGenres: gameGenreDocs.map(doc => ({ ref: doc._id, name: doc.name, slug: doc.slug })),
      animeFavorites: animeFavDocs.map(doc => ({ ref: doc._id, title: doc.title })),
      gameFavorites: gameFavDocs.map(doc => ({ ref: doc._id, title: doc.title })),
    };
    user.isOnboarded = true;

    await user.save();

    return res.status(200).json({
      status: true,
      message: "Onboarding completed successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Onboarding Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getMetadata = async (req, res) => {
  try {
    const [animeCategories, gameCategories, animeTitles, gameTitles] = await Promise.all([
      AnimeCategory.find({}).sort({ name: 1 }),
      GameCategory.find({}).sort({ name: 1 }),
      AnimeTitle.find({}).populate("categories").sort({ title: 1 }),
      GameTitle.find({}).populate("categories").sort({ title: 1 }),
    ]);

    return res.status(200).json({
      status: true,
      animeCategories,
      gameCategories,
      animeTitles,
      gameTitles,
    });
  } catch (error) {
    console.error("Fetch Metadata Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }

    const {
      fullname, email, gender, age, location, locationDetails, bio, username,
      height, weight, education, drinking, smoking, lookingFor, kids, politics, religion, discord, instagram
    } = req.body;

    if (email && email.toLowerCase().trim() !== user.email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ status: false, message: "Email is already in use by another user" });
      }
      user.email = normalizedEmail;
    }

    if (username && username.trim() !== user.username) {
      const normalizedUsername = username.trim();
      const existingUser = await User.findOne({ username: normalizedUsername });
      if (existingUser) {
        return res.status(400).json({ status: false, message: "Username is already taken" });
      }
      user.username = normalizedUsername;
      if (!user.avatar || user.avatar.startsWith("https://api.dicebear.com/")) {
        user.avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${normalizedUsername}`;
      }
    }

    // Mandatory fields
    user.fullname = fullname !== undefined ? fullname.trim() : user.fullname;
    user.gender = gender !== undefined ? gender.trim() : user.gender;
    user.age = age !== undefined ? Number(age) : user.age;
    user.location = location !== undefined ? location.trim() : user.location;
    
    if (locationDetails !== undefined) {
      user.locationDetails = {
        city: locationDetails?.city || "",
        state: locationDetails?.state || "",
        country: locationDetails?.country || "",
        coordinates: {
          type: "Point",
          coordinates: locationDetails?.coordinates && Array.isArray(locationDetails.coordinates)
            ? [Number(locationDetails.coordinates[0]), Number(locationDetails.coordinates[1])]
            : [0, 0]
        }
      };
    }

    user.bio = bio !== undefined ? bio.trim() : user.bio;

    // Optional "More About You" fields
    user.height = height !== undefined ? height.trim() : user.height;
    user.weight = weight !== undefined ? weight.trim() : user.weight;
    user.education = education !== undefined ? education.trim() : user.education;
    user.drinking = drinking !== undefined ? drinking.trim() : user.drinking;
    user.smoking = smoking !== undefined ? smoking.trim() : user.smoking;
    user.lookingFor = lookingFor !== undefined ? lookingFor.trim() : user.lookingFor;
    user.kids = kids !== undefined ? kids.trim() : user.kids;
    user.politics = politics !== undefined ? politics.trim() : user.politics;
    user.religion = religion !== undefined ? religion.trim() : user.religion;
    user.discord = discord !== undefined ? discord.trim() : user.discord;
    user.instagram = instagram !== undefined ? instagram.trim() : user.instagram;

    // Mark profile as completed if all mandatory fields are filled
    if (user.fullname && user.gender && user.age && user.location) {
      user.isProfileCompleted = true;
    }

    await user.save();



    return res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// Upload single avatar
export const uploadAvatar = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: "No file uploaded" });
    }

    // Delete old avatar from disk if custom
    if (user.avatar && user.avatar.startsWith("/public/profilepic/")) {
      const oldPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (unlinkErr) {
          console.error("Failed to delete old avatar file:", unlinkErr);
        }
      }
    }

    const relativePath = `/public/profilepic/${req.file.filename}`;
    user.avatar = relativePath;
    await user.save();



    return res.status(200).json({
      status: true,
      message: "Avatar uploaded successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Upload Avatar Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// Upload photo to profilePics array (up to 6 photos)
export const uploadPhoto = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: "No file uploaded" });
    }

    if (user.profilePics && user.profilePics.length >= 6) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error("Failed to delete rejected file:", unlinkErr);
      }
      return res.status(400).json({ status: false, message: "Maximum of 6 profile pictures allowed" });
    }

    const relativePath = `/public/profilepic/${req.file.filename}`;
    if (!user.profilePics) {
      user.profilePics = [];
    }
    user.profilePics.push(relativePath);
    await user.save();



    return res.status(200).json({
      status: true,
      message: "Photo uploaded successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Upload Photo Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

// Delete photo from profilePics array
export const deletePhoto = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(400).json({ status: false, message: "Photo URL is required" });
    }

    user.profilePics = user.profilePics.filter(pic => pic !== photoUrl);
    await user.save();

    if (photoUrl.startsWith("/public/profilepic/")) {
      const resolvedPath = path.resolve(process.cwd(), photoUrl.replace(/^\//, ""));
      const uploadsDirectory = path.resolve(process.cwd(), "public/profilepic");

      if (!resolvedPath.startsWith(uploadsDirectory)) {
        return res.status(400).json({ status: false, message: "Invalid photo URL: path traversal detected" });
      }

      if (fs.existsSync(resolvedPath)) {
        try {
          fs.unlinkSync(resolvedPath);
        } catch (unlinkErr) {
          console.error("Failed to delete file from disk:", unlinkErr);
        }
      }
    }



    return res.status(200).json({
      status: true,
      message: "Photo deleted successfully",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Delete Photo Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getCountries = async (req, res) => {
  try {
    const countries = await Country.find({}).sort({ name: 1 });
    return res.status(200).json({ status: true, countries });
  } catch (error) {
    console.error("Get Countries Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getStates = async (req, res) => {
  try {
    const { countryId } = req.params;
    const states = await State.find({ country: countryId }).sort({ name: 1 });
    return res.status(200).json({ status: true, states });
  } catch (error) {
    console.error("Get States Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getCities = async (req, res) => {
  try {
    const { stateId } = req.params;
    const cities = await City.find({ state: stateId }).sort({ name: 1 });
    return res.status(200).json({ status: true, cities });
  } catch (error) {
    console.error("Get Cities Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getCandidates = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all users the current user has permanently swiped on (likes and super-likes)
    const permanentExcludes = await Swipe.find({
      swiper: currentUserId,
      swipeType: { $in: ["like", "super"] }
    }).distinct("swipee");

    // Find recent passes (within the last 3 days) to exclude
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const recentPasses = await Swipe.find({
      swiper: currentUserId,
      swipeType: "pass",
      createdAt: { $gte: threeDaysAgo }
    }).distinct("swipee");

    // Combine permanent exclusions and recent passes
    const excludedUserIds = [...new Set([...permanentExcludes, ...recentPasses])];

    // Construct query based on logged-in user's preference path (anime/game/both)
    const userPath = req.user.preferences?.path || "both";
    const query = {
      _id: { $ne: currentUserId, $nin: excludedUserIds },
      isOnboarded: true
    };

    if (userPath === "anime") {
      query["preferences.path"] = { $in: ["anime", "both"] };
    } else if (userPath === "game") {
      query["preferences.path"] = { $in: ["game", "both"] };
    }

    // Find candidates matching the query with a limit of 40 to optimize database load
    const users = await User.find(query)
      .select("username avatar profilePics isVerified fullname gender age location bio preferences height weight education drinking smoking lookingFor kids politics religion isPremium activeSubscription userId")
      .limit(40);
    
    const hasSubscription = req.user.activeSubscription &&
                            req.user.activeSubscription.expiresAt &&
                            new Date(req.user.activeSubscription.expiresAt) > new Date();

    // Calculate swipes left today (5 limit per calendar day in UTC)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todaySwipesCount = await Swipe.countDocuments({
      swiper: currentUserId,
      createdAt: { $gte: startOfDay }
    });

    const swipesLeft = hasSubscription ? 9999 : Math.max(0, 5 + (req.user.extraSwipesBalance || 0) - todaySwipesCount);
    const resetTime = new Date();
    resetTime.setUTCHours(24, 0, 0, 0); // Midnight UTC

    const candidates = users.map(user => buildPublicUserResponse(user));
    return res.status(200).json({
      status: true,
      candidates,
      swipesLeft,
      resetTime
    });
  } catch (error) {
    console.error("Get Candidates Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const swipeUser = async (req, res) => {
  try {
    const swiperId = req.user._id;
    const { swipeeId, swipeType, compliment } = req.body;

    if (!swipeeId || !swipeType) {
      return res.status(400).json({ status: false, message: "Swipee ID and swipe type are required" });
    }

    if (!["like", "pass", "super"].includes(swipeType)) {
      return res.status(400).json({ status: false, message: "Invalid swipe type" });
    }

    // Check if target user exists
    const swipee = await User.findById(swipeeId);
    if (!swipee) {
      return res.status(404).json({ status: false, message: "Target user not found" });
    }

    // Check compliment limit if a compliment is being sent
    if (compliment && compliment.trim()) {
      const isPremium = req.user.isPremium || false;
      const balance = req.user.complimentsBalance !== undefined ? req.user.complimentsBalance : 1;

      if (!isPremium && balance <= 0) {
        return res.status(403).json({
          status: false,
          needsSubscription: true,
          message: "You have depleted your free compliment! A subscription or paid refill is required to transmit more compliments."
        });
      }
    }

    // Check if already swiped on this user
    const existingSwipe = await Swipe.findOne({ swiper: swiperId, swipee: swipeeId });
    if (existingSwipe) {
      return res.status(400).json({ status: false, message: "You have already swiped on this user" });
    }

    const user = req.user;
    const hasSubscription = user.activeSubscription &&
                            user.activeSubscription.expiresAt &&
                            new Date(user.activeSubscription.expiresAt) > new Date();
    let userModified = false;

    if (swipeType === "super") {
      if (!hasSubscription) {
        const superBalance = user.superLikesBalance !== undefined ? user.superLikesBalance : 1;
        if (superBalance <= 0) {
          return res.status(403).json({
            status: false,
            needsRefill: true,
            message: "Super Likes depleted! Please purchase a plan or refill to get more."
          });
        }
        user.superLikesBalance = Math.max(0, superBalance - 1);
        userModified = true;
      }
    }

    // Check daily limit (5 swipes per UTC day + extra swipes)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todaySwipesCount = await Swipe.countDocuments({
      swiper: swiperId,
      createdAt: { $gte: startOfDay }
    });

    const resetTime = new Date();
    resetTime.setUTCHours(24, 0, 0, 0);

    const totalSwipesAllowed = 5 + (user.extraSwipesBalance || 0);

    if (!hasSubscription && todaySwipesCount >= totalSwipesAllowed) {
      return res.status(403).json({
        status: false,
        limitReached: true,
        message: "Radar calibration energy depleted! Daily swipe limit reached. Please wait for the next radar refresh or purchase a refill.",
        resetTime,
        swipesLeft: 0
      });
    }

    // Record swipe
    const newSwipe = new Swipe({
      swiper: swiperId,
      swipee: swipeeId,
      swipeType,
    });
    await newSwipe.save();

    // Hook for Welcome Bot instant match response (Strategy 4)
    if (swipee.isBot && ["like", "super"].includes(swipeType)) {
      // Create reverse swipe from Bot to User if it doesn't already exist (fail-safe)
      const botSwipeExists = await Swipe.findOne({ swiper: swipeeId, swipee: swiperId });
      if (!botSwipeExists) {
        await Swipe.create({
          swiper: swipeeId,
          swipee: swiperId,
          swipeType: "like"
        });
      }

      // Check if a welcome message has already been sent to avoid duplicates
      const welcomeMsgExists = await Message.findOne({ sender: swipeeId, receiver: swiperId });
      if (!welcomeMsgExists) {
        const welcomeMessage = new Message({
          sender: swipeeId,
          receiver: swiperId,
          content: "Hi! Welcome to OtakuDuo. I'm Jarvis, your system guide. I can help you calibrate your credentials, search for other players, or just keep you company. What anime or game are you currently hyperfocused on?",
          isRead: false,
        });
        await welcomeMessage.save();
      }
    }

    // Deduct extra swipes if daily limit exceeded
    if (!hasSubscription && todaySwipesCount >= 5) {
      user.extraSwipesBalance = Math.max(0, (user.extraSwipesBalance || 0) - 1);
      userModified = true;
    }

    // If a compliment is provided, store it as a Message document
    if (compliment && compliment.trim()) {
      const newMessage = new Message({
        sender: swiperId,
        receiver: swipeeId,
        content: compliment.trim(),
        isRead: false,
      });
      await newMessage.save();

      // Deduct compliments balance if user is not premium
      if (!user.isPremium) {
        user.complimentsBalance = Math.max(0, (user.complimentsBalance || 1) - 1);
        userModified = true;
      }
    }

    if (userModified) {
      await user.save();
    }

    const newSwipesLeft = hasSubscription ? 9999 : Math.max(0, 5 + (user.extraSwipesBalance || 0) - (todaySwipesCount + 1));

    return res.status(201).json({
      status: true,
      message: "Swipe recorded successfully",
      swipesLeft: newSwipesLeft,
      resetTime,
      complimentsBalance: user.complimentsBalance !== undefined ? user.complimentsBalance : 1,
    });
  } catch (error) {
    console.error("Swipe User Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const reportUser = async (req, res) => {
  try {
    const reporter = req.user._id;
    const { reportedUserId, reason, details } = req.body;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ status: false, message: "Reported user ID and reason are required" });
    }

    const report = new Report({
      reporter,
      reportedUser: reportedUserId,
      reason,
      details,
    });

    await report.save();

    return res.status(201).json({ status: true, message: "User reported successfully" });
  } catch (error) {
    console.error("Report User Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const DEFAULT_PLANS = [
  {
    planId: "mana-drop",
    name: "Mana Drop",
    price: 49,
    originalPrice: 99,
    description: "Quick refill for active explorers.",
    type: "refill",
    durationDays: 0,
    benefits: [
      { text: "15 Extra Swipes", iconName: "FaGamepad" },
      { text: "2 Compliments", iconName: "FaStar" },
      { text: "1 Super Like", iconName: "FaFire" }
    ],
    complimentsRefill: 2,
    isPremium: false,
  },
  {
    planId: "power-surge",
    name: "Power Surge",
    price: 99,
    originalPrice: 199,
    description: "Unleash your energy for 24 hours.",
    type: "subscription",
    durationDays: 1,
    benefits: [
      { text: "Unlimited Swipes for 24 Hours", iconName: "FaBolt" },
      { text: "4 Direct Messages", iconName: "FaRocket" },
      { text: "3 Super Likes", iconName: "FaStar" }
    ],
    complimentsRefill: 4,
    isPremium: false,
  },
  {
    planId: "otaku-pass",
    name: "Otaku Pass",
    price: 143,
    originalPrice: 299,
    description: "Unlock your full anime and gaming potential. (Weekly Reset)",
    type: "subscription",
    durationDays: 7,
    benefits: [
      { text: "Unlimited Swipes", iconName: "FaBolt" },
      { text: "Spotlight Profile", iconName: "FaStar" },
      { text: "10 Messages per Week", iconName: "FaRocket" },
      { text: "5 Super Likes per Week", iconName: "FaFire" }
    ],
    complimentsRefill: 10,
    isPremium: true,
  }
];

export const getPlans = async (req, res) => {
  try {
    let plans = await Plan.find({});
    if (plans.length === 0) {
      plans = await Plan.insertMany(DEFAULT_PLANS);
    }
    return res.status(200).json({ status: true, plans });
  } catch (error) {
    console.error("Get Plans Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ status: false, message: "Plan ID is required" });
    }

    let plan = await Plan.findOne({ planId });
    if (!plan) {
      // Seed default plans if not seeded yet
      const count = await Plan.countDocuments({});
      if (count === 0) {
        await Plan.insertMany(DEFAULT_PLANS);
        plan = await Plan.findOne({ planId });
      }
    }

    if (!plan) {
      return res.status(404).json({ status: false, message: "Subscription plan not found" });
    }

    const amount = plan.price * 100; // convert INR to paise

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).json({ status: false, message: "Failed to create Razorpay order" });
    }

    return res.status(201).json({
      status: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      planId,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      return res.status(400).json({ status: false, message: "All payment credentials are required" });
    }

    const plan = await Plan.findOne({ planId });
    if (!plan) {
      return res.status(404).json({ status: false, message: "Plan not found" });
    }

    // Verify signature using HMAC SHA256
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const signatureBuffer = Buffer.from(razorpay_signature, "hex");

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return res.status(400).json({ status: false, message: "Transaction verification failed. Signature mismatch." });
    }

    const user = req.user;
    
    // Determine if user is a girl
    const isGirl = user.gender && ["female", "girl", "woman"].includes(user.gender.toLowerCase().trim());
    const multiplier = isGirl ? 2 : 1;

    // Apply compliments refill
    const complimentsAdded = plan.complimentsRefill * multiplier;
    user.complimentsBalance = (user.complimentsBalance !== undefined ? user.complimentsBalance : 1) + complimentsAdded;

    // Apply extra swipes if any
    let extraSwipesAdded = 0;
    if (plan.planId === "mana-drop") {
      extraSwipesAdded = 15 * multiplier;
      user.extraSwipesBalance = (user.extraSwipesBalance || 0) + extraSwipesAdded;
    }

    // Apply super likes if any
    let superLikesAdded = 0;
    if (plan.planId === "mana-drop") {
      superLikesAdded = 1 * multiplier;
    } else if (plan.planId === "power-surge") {
      superLikesAdded = 3 * multiplier;
    } else if (plan.planId === "otaku-pass") {
      superLikesAdded = 5 * multiplier;
    }
    user.superLikesBalance = (user.superLikesBalance !== undefined ? user.superLikesBalance : 1) + superLikesAdded;

    // Apply premium features if plan grants them
    if (plan.isPremium) {
      user.isPremium = true;
    }

    // Record subscription limits if it's a subscription type
    if (plan.type === "subscription" && plan.durationDays > 0) {
      const purchasedAt = new Date();
      const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      user.activeSubscription = {
        plan: plan._id,
        planId: plan.planId,
        purchasedAt,
        expiresAt,
      };
    }

    await user.save();

    // Store payment transaction in MongoDB
    const paymentLog = new Payment({
      user: user._id,
      planId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount: plan.price * 100,
      status: "verified",
    });
    await paymentLog.save();

    return res.status(200).json({
      status: true,
      message: "Payment successfully verified and benefits applied!",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getLobbyLikes = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Swipes made by current user
    const swipedUserIds = await Swipe.find({ swiper: currentUserId }).distinct("swipee");

    // Swipes received by current user (likes or supers)
    const likedSwipes = await Swipe.find({
      swipee: currentUserId,
      swiper: { $nin: swipedUserIds },
      swipeType: { $in: ["like", "super"] }
    }).populate("swiper", "username avatar profilePics isVerified fullname gender age location bio preferences height weight education drinking smoking lookingFor kids politics religion isPremium activeSubscription userId");

    const likes = likedSwipes.map(s => {
      const userRes = buildPublicUserResponse(s.swiper);
      if (userRes) {
        userRes.swipeType = s.swipeType;
        userRes.compliment = s.compliment || "";
      }
      return userRes;
    }).filter(Boolean);
    return res.status(200).json({ status: true, likes });
  } catch (error) {
    console.error("Get Lobby Likes Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getLobbyChats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // 1. Get mutual matches
    const myLikes = await Swipe.find({ swiper: currentUserId, swipeType: { $in: ["like", "super"] } }).distinct("swipee");
    const mutualLikes = await Swipe.find({
      swiper: { $in: myLikes },
      swipee: currentUserId,
      swipeType: { $in: ["like", "super"] }
    });
    const mutualUserIds = mutualLikes.map(s => s.swiper.toString());

    // 2. Get all distinct message partners
    const chatUsers = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }]
    }).distinct("sender");
    const chatUsers2 = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }]
    }).distinct("receiver");
    
    const allChatUserIds = Array.from(new Set([...chatUsers, ...chatUsers2]))
      .map(id => id.toString())
      .filter(id => id !== currentUserId.toString());

    const allChannelUserIds = Array.from(new Set([...mutualUserIds, ...allChatUserIds]));

    // 3. Construct channels details
    const channels = [];
    for (const userId of allChannelUserIds) {
      const otherUser = await User.findById(userId).select("username avatar profilePics isVerified fullname gender age location bio preferences height weight education drinking smoking lookingFor kids politics religion isPremium activeSubscription userId");
      if (!otherUser) continue;

      const latestMessage = await Message.findOne({
        $or: [
          { sender: currentUserId, receiver: userId },
          { sender: userId, receiver: currentUserId }
        ]
      }).sort({ createdAt: -1 });

      // Check if it's an incoming direct chat request (compliment/message sent to current user, not mutual, and current user has not replied yet)
      const isMutual = mutualUserIds.includes(userId);
      const currentSentMessageCount = await Message.countDocuments({ sender: currentUserId, receiver: userId });
      const isIncomingRequest = !isMutual && currentSentMessageCount === 0;

      channels.push({
        user: buildPublicUserResponse(otherUser),
        latestMessage: latestMessage ? {
          id: latestMessage._id,
          content: latestMessage.content,
          sender: latestMessage.sender,
          receiver: latestMessage.receiver,
          isRead: latestMessage.isRead,
          createdAt: latestMessage.createdAt
        } : null,
        isIncomingRequest,
        isMutual
      });
    }

    // Sort channels by latest message time
    channels.sort((a, b) => {
      const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
      const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
      return timeB - timeA;
    });

    return res.status(200).json({ status: true, channels });
  } catch (error) {
    console.error("Get Lobby Chats Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ status: false, message: "Invalid target user ID" });
    }

    // Check if it is locked for incoming requests without Weekly Pass
    const myLike = await Swipe.findOne({ swiper: currentUserId, swipee: otherUserId, swipeType: { $in: ["like", "super"] } });
    const otherLike = await Swipe.findOne({ swiper: otherUserId, swipee: currentUserId, swipeType: { $in: ["like", "super"] } });
    const isMutual = myLike && otherLike;

    const currentSentMessageCount = await Message.countDocuments({ sender: currentUserId, receiver: otherUserId });
    const isIncomingRequest = !isMutual && currentSentMessageCount === 0;

    const hasWeeklyPass = req.user.activeSubscription &&
                          req.user.activeSubscription.planId === "otaku-pass" &&
                          new Date(req.user.activeSubscription.expiresAt) > new Date();

    if (isIncomingRequest && !hasWeeklyPass) {
      return res.status(403).json({
        status: false,
        needsWeeklyPass: true,
        message: "Incoming chat request locked. Upgrade to Otaku Pass to view and reply!"
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    // Mark incoming messages as read
    await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({ status: true, messages });
  } catch (error) {
    console.error("Get Chat Messages Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ status: false, message: "Receiver ID and message content are required" });
    }

    const hasSubscription = req.user.activeSubscription &&
                            req.user.activeSubscription.expiresAt &&
                            new Date(req.user.activeSubscription.expiresAt) > new Date();

    // Check message balance if not subscribed
    if (!hasSubscription) {
      if (req.user.complimentsBalance <= 0) {
        return res.status(403).json({
          status: false,
          needsRefill: true,
          message: "Message balance depleted! Please purchase a refill or weekly pass to send messages."
        });
      }
      req.user.complimentsBalance = Math.max(0, req.user.complimentsBalance - 1);
      await req.user.save();
    }

    const newMessage = new Message({
      sender: currentUserId,
      receiver: receiverId,
      content: content.trim(),
      isRead: false
    });
    await newMessage.save();

    // Import and send message via Socket.io
    const { sendRealtimeMessage } = await import("../socket/socket.js");
    sendRealtimeMessage(receiverId, newMessage);

    return res.status(201).json({
      status: true,
      message: "Message sent successfully",
      newMessage,
      complimentsBalance: req.user.complimentsBalance
    });
  } catch (error) {
    console.error("Send Chat Message Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const redeemPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ status: false, message: "Plan ID is required" });
    }

    if (!["mana-drop", "power-surge"].includes(planId)) {
      return res.status(400).json({ status: false, message: "Only Mana Drop and Power Surge are redeemable via Synergy points" });
    }

    const user = req.user;
    const requiredSynergy = planId === "mana-drop" ? 5000 : 10000;

    if ((user.synergy || 0) < requiredSynergy) {
      return res.status(400).json({
        status: false,
        message: `Insufficient Quantum Synergy! You need ${requiredSynergy} points, but currently have ${user.synergy || 0}.`
      });
    }

    const plan = await Plan.findOne({ planId });
    if (!plan) {
      return res.status(404).json({ status: false, message: "Plan not found" });
    }

    // Deduct synergy points
    user.synergy = Math.max(0, (user.synergy || 0) - requiredSynergy);

    // Apply benefits (accounting for girls 2x multiplier!)
    const isGirl = user.gender && ["female", "girl", "woman"].includes(user.gender.toLowerCase().trim());
    const multiplier = isGirl ? 2 : 1;

    // Apply compliments refill
    const complimentsAdded = plan.complimentsRefill * multiplier;
    user.complimentsBalance = (user.complimentsBalance !== undefined ? user.complimentsBalance : 1) + complimentsAdded;

    // Apply extra swipes if any
    let extraSwipesAdded = 0;
    if (plan.planId === "mana-drop") {
      extraSwipesAdded = 15 * multiplier;
      user.extraSwipesBalance = (user.extraSwipesBalance || 0) + extraSwipesAdded;
    }

    // Apply super likes if any
    let superLikesAdded = 0;
    if (plan.planId === "mana-drop") {
      superLikesAdded = 1 * multiplier;
    } else if (plan.planId === "power-surge") {
      superLikesAdded = 3 * multiplier;
    }
    user.superLikesBalance = (user.superLikesBalance !== undefined ? user.superLikesBalance : 1) + superLikesAdded;

    // Apply premium features if plan grants them
    if (plan.isPremium) {
      user.isPremium = true;
    }

    // Record subscription limits if subscription
    if (plan.type === "subscription" && plan.durationDays > 0) {
      const purchasedAt = new Date();
      const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      user.activeSubscription = {
        plan: plan._id,
        planId: plan.planId,
        purchasedAt,
        expiresAt,
      };
    }

    await user.save();

    // Store payment transaction as synergy redemption
    const paymentLog = new Payment({
      user: user._id,
      planId,
      razorpay_payment_id: `synergy_redeem_${Date.now()}`,
      razorpay_order_id: `synergy_order_${Date.now()}`,
      razorpay_signature: "synergy_redeemed",
      amount: 0,
      status: "verified",
    });
    await paymentLog.save();

    return res.status(200).json({
      status: true,
      message: `Plan successfully redeemed using ${requiredSynergy} Synergy points!`,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Redeem Plan Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Initiate forgot password process.
 * Route: POST /api/user/forgot-password
 * 
 * Imports Used:
 * - User (from ../Models/user.schema.js)
 * - sendEmail (from ../utils/email.js)
 * - generateOTP (local helper function)
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "User with this email not found" });
    }

    const otp = generateOTP();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    // Send OTP verification email
    try {
      await sendEmail({
        to: user.email,
        templateIdentifier: "forgot-password",
        replacements: {
          fullname: user.fullname || user.username || "Otaku User",
          otp: otp
        }
      });
    } catch (mailErr) {
      console.error("Failed to send reset password email:", mailErr);
    }

    return res.status(200).json({
      message: "Reset code sent to your email.",
      status: true,
      email: user.email,
      resetPasswordOtpExpiresAt: user.resetPasswordOtpExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Reset user password with OTP code.
 * Route: POST /api/user/reset-password
 * 
 * Imports Used:
 * - User (from ../Models/user.schema.js)
 * - bcrypt (from bcryptjs)
 * - generateRandomUsername (local helper function)
 * - generateUserId (from ../utils/jwt.js)
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.resetPasswordOtp) {
      return res.status(400).json({ message: "No password reset request found" });
    }

    // Check expiry
    if (user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt < new Date()) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpiresAt = undefined;
      await user.save();
      return res.status(400).json({ message: "Reset code has expired. Please request a new one." });
    }

    // Compare OTP
    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear forgot password fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiresAt = undefined;

    // Automatically verify the user since they verified their email ownership via forgot-password code
    user.isVerified = true;

    // Auto-generate username/userId if the user registered via social login but did not complete basic profile/sign up setup yet (e.g. user was unverified/OAuth without password)
    if (!user.username) {
      user.username = await generateRandomUsername();
    }
    if (!user.userId) {
      user.userId = await generateUserId();
    }

    await user.save();

    return res.status(200).json({
      status: true,
      message: "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Retrieve public profile details for a specific user.
 * Route: GET /api/user/profile/:id
 * 
 * Imports Used:
 * - User (from ../Models/user.schema.js)
 * - buildPublicUserResponse (local helper function)
 */
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: "Invalid user ID format" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: false, message: "User profile not found" });
    }

    return res.status(200).json({
      status: true,
      user: buildPublicUserResponse(user),
    });
  } catch (error) {
    console.error("Get User Profile Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export default {
  checkEmail,
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  oauthLoginOrSignup,
  onboardUser,
  getMetadata,
  updateProfile,
  uploadAvatar,
  uploadPhoto,
  deletePhoto,
  getCountries,
  getStates,
  getCities,
  generateUsername,
  getCandidates,
  swipeUser,
  reportUser,
  createOrder,
  verifyPayment,
  getPlans,
  getLobbyLikes,
  getLobbyChats,
  getChatMessages,
  sendChatMessage,
  redeemPlan,
  forgotPassword,
  resetPassword,
  getUserProfile,
};
