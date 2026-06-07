import User from "../Models/user.schema.js";
import bcrypt from "bcryptjs";
import { generateToken, generateUserId } from "../utils/jwt.js";
import AnimeCategory from "../Models/animeCategory.schema.js";
import GameCategory from "../Models/gameCategory.schema.js";
import AnimeTitle from "../Models/animeTitle.schema.js";
import GameTitle from "../Models/gameTitle.schema.js";
import Country from "../Models/country.schema.js";
import State from "../Models/state.schema.js";
import City from "../Models/city.schema.js";
import Report from "../Models/report.schema.js";
import fs from "fs";
import path from "path";

// Hardcoded OTP for development
const HARDCODED_OTP = "123456";

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
  return {
    id: user._id,
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
    bio: user.bio || "",
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
    const { fullname, email, password } = req.body;

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
        user.otp = HARDCODED_OTP;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
        await user.save();

        return res.status(200).json({
          message: "OTP sent to your email for verification.",
          requiresOtp: true,
          email: user.email,
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

    user = new User({
      username: generatedUsername,
      fullname: fullname.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      userId: userId,
      avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`,
      otp: HARDCODED_OTP,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    });

    await user.save();

    return res.status(201).json({
      message: "OTP sent to your email for verification.",
      status: true,
      email: user.email,
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
      return res.status(400).json({ message: "OTP has expired. Please register again." });
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
    

    // OTP verified — mark user as verified, clear OTP
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    !user.userId && (user.userId = userId);
    await user.save();



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
 */
export const oauthLoginOrSignup = async (req, res) => {
  try {
    const { email, username, provider, providerId, avatar } = req.body;

    if (!email || !provider || !providerId) {
      return res.status(400).json({ message: "Email, provider, and providerId are required" });
    }

    if (provider !== "google" && provider !== "discord") {
      return res.status(400).json({ message: "Invalid OAuth provider" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      let updated = false;

      if (provider === "google" && !user.googleId) {
        user.googleId = providerId;
        updated = true;
      } else if (provider === "discord" && !user.discordId) {
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

      if (updated) await user.save();
    } else {
      const generatedUsername = await generateRandomUsername();
      user = new User({
        username: generatedUsername,
        email: normalizedEmail,
        fullname: username ? username.trim() : "",
        avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`,
        googleId: provider === "google" ? providerId : undefined,
        discordId: provider === "discord" ? providerId : undefined,
        isVerified: true,
      });

      await user.save();
    }



    const token = generateToken(user._id);
    return res.status(200).json({
      message: "OAuth login successful",
      user: buildUserResponse(user),
      token,
    });
  } catch (error) {
    console.error("OAuth Error:", error);
    return res.status(500).json({ message: "Internal server error" });
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
      fullname, email, gender, age, location, bio, username,
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
      const filePath = path.join(process.cwd(), photoUrl);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
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
    // Find users who are not the current user and are onboarded
    const users = await User.find({
      _id: { $ne: currentUserId },
      isOnboarded: true
    });
    
    const candidates = users.map(user => buildUserResponse(user));
    return res.status(200).json({ status: true, candidates });
  } catch (error) {
    console.error("Get Candidates Error:", error);
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

export default {
  checkEmail,
  registerUser,
  verifyOtp,
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
  reportUser,
};
