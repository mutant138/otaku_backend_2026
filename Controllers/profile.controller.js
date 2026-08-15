import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import dbCommonQuery from "../utils/dbCommonQuery.js";
import { buildUserResponse, buildPublicUserResponse } from "../utils/userHelper.js";

/**
 * Onboard user preferences.
 * Route: POST /api/user/onboard
 */
export const onboardUser = async (req, res) => {
  try {
    const { preferences } = req.body;
    const authUser = req.user;

    if (!authUser) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }

    if (!preferences || !preferences.path) {
      return res.status(400).json({ status: false, message: "Onboarding preferences are required" });
    }

    const [animeGenreDocs, gameGenreDocs, animeFavDocs, gameFavDocs] = await Promise.all([
      dbCommonQuery({ model: "AnimeCategory", action: "find", filter: { _id: { $in: preferences.animeGenres || [] } }, lean: true }),
      dbCommonQuery({ model: "GameCategory", action: "find", filter: { _id: { $in: preferences.gameGenres || [] } }, lean: true }),
      dbCommonQuery({ model: "AnimeTitle", action: "find", filter: { _id: { $in: preferences.animeFavorites || [] } }, lean: true }),
      dbCommonQuery({ model: "GameTitle", action: "find", filter: { _id: { $in: preferences.gameFavorites || [] } }, lean: true }),
    ]);

    const formattedPreferences = {
      path: preferences.path,
      animeGenres: animeGenreDocs.map((doc) => ({ ref: doc._id, name: doc.name, slug: doc.slug })),
      gameGenres: gameGenreDocs.map((doc) => ({ ref: doc._id, name: doc.name, slug: doc.slug })),
      animeFavorites: animeFavDocs.map((doc) => ({ ref: doc._id, title: doc.title })),
      gameFavorites: gameFavDocs.map((doc) => ({ ref: doc._id, title: doc.title })),
    };

    const updatedUser = await dbCommonQuery({
      model: "User",
      action: "findByIdAndUpdate",
      filter: authUser._id,
      data: {
        preferences: formattedPreferences,
        isOnboarded: true,
      },
      lean: false,
    });

    return res.status(200).json({
      status: true,
      message: "Onboarding completed successfully",
      user: buildUserResponse(updatedUser),
    });
  } catch (error) {
    console.error("Onboarding Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Fetch categories and titles metadata.
 * Route: GET /api/user/metadata
 */
export const getMetadata = async (req, res) => {
  try {
    const [animeCategories, gameCategories, animeTitles, gameTitles] = await Promise.all([
      dbCommonQuery({ model: "AnimeCategory", action: "find", filter: {}, sort: { name: 1 }, lean: true }),
      dbCommonQuery({ model: "GameCategory", action: "find", filter: {}, sort: { name: 1 }, lean: true }),
      dbCommonQuery({ model: "AnimeTitle", action: "find", filter: {}, populate: "categories", sort: { title: 1 }, lean: true }),
      dbCommonQuery({ model: "GameTitle", action: "find", filter: {}, populate: "categories", sort: { title: 1 }, lean: true }),
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

/**
 * Update profile details.
 * Route: PUT /api/user/update-profile
 */
export const updateProfile = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: authUser._id,
      lean: false,
    });

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const {
      fullname, email, gender, age, location, locationDetails, bio, username,
      height, weight, education, drinking, smoking, lookingFor, kids, politics, discord, instagram
    } = req.body;

    if (email && email.toLowerCase().trim() !== user.email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await dbCommonQuery({
        model: "User",
        action: "findOne",
        filter: { email: normalizedEmail },
        lean: true,
      });
      if (existingUser) {
        return res.status(400).json({ status: false, message: "Email is already in use by another user" });
      }
      user.email = normalizedEmail;
    }

    if (username && username.trim() !== user.username) {
      const normalizedUsername = username.trim();
      const existingUser = await dbCommonQuery({
        model: "User",
        action: "findOne",
        filter: { username: normalizedUsername },
        lean: true,
      });
      if (existingUser) {
        return res.status(400).json({ status: false, message: "Username is already taken" });
      }
      user.username = normalizedUsername;
      if (!user.avatar || user.avatar.startsWith("https://api.dicebear.com/")) {
        user.avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${normalizedUsername}`;
      }
    }

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
    user.height = height !== undefined ? height.trim() : user.height;
    user.weight = weight !== undefined ? weight.trim() : user.weight;
    user.education = education !== undefined ? education.trim() : user.education;
    user.drinking = drinking !== undefined ? drinking.trim() : user.drinking;
    user.smoking = smoking !== undefined ? smoking.trim() : user.smoking;
    user.lookingFor = lookingFor !== undefined ? lookingFor.trim() : user.lookingFor;
    user.kids = kids !== undefined ? kids.trim() : user.kids;
    user.politics = politics !== undefined ? politics.trim() : user.politics;
    user.discord = discord !== undefined ? discord.trim() : user.discord;
    user.instagram = instagram !== undefined ? instagram.trim() : user.instagram;

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

/**
 * Upload profile avatar.
 * Route: POST /api/user/upload-avatar
 */
export const uploadAvatar = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: "No file uploaded" });
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: authUser._id,
      lean: false,
    });

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

/**
 * Upload photo to profilePics array.
 * Route: POST /api/user/upload-photo
 */
export const uploadPhoto = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: "No file uploaded" });
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: authUser._id,
      lean: false,
    });

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

/**
 * Delete photo from profilePics array.
 * Route: DELETE /api/user/delete-photo
 */
export const deletePhoto = async (req, res) => {
  try {
    const authUser = req.user;
    if (!authUser) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(400).json({ status: false, message: "Photo URL is required" });
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: authUser._id,
      lean: false,
    });

    if (user.isOnboarded && user.profilePics.length <= 1 && user.profilePics.includes(photoUrl)) {
      return res.status(400).json({ status: false, message: "You must keep at least one profile photo." });
    }

    user.profilePics = user.profilePics.filter((pic) => pic !== photoUrl);
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
    const countries = await dbCommonQuery({
      model: "Country",
      action: "find",
      filter: {},
      sort: { name: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, countries });
  } catch (error) {
    console.error("Get Countries Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getStates = async (req, res) => {
  try {
    const { countryId } = req.params;
    const states = await dbCommonQuery({
      model: "State",
      action: "find",
      filter: { country: countryId },
      sort: { name: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, states });
  } catch (error) {
    console.error("Get States Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getCities = async (req, res) => {
  try {
    const { stateId } = req.params;
    const cities = await dbCommonQuery({
      model: "City",
      action: "find",
      filter: { state: stateId },
      sort: { name: 1 },
      lean: true,
    });
    return res.status(200).json({ status: true, cities });
  } catch (error) {
    console.error("Get Cities Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Retrieve public profile details for a specific user ID.
 * Route: GET /api/user/profile/:id
 */
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: "Invalid user ID format" });
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: id,
      lean: true,
    });

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
