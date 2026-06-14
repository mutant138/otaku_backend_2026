import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  userId: {
    type: String,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    // Optional because users who sign up via Google/Discord OAuth do not need a password.
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple users who haven't linked Google to not conflict.
  },
  discordId: {
    type: String,
    unique: true,
    sparse: true, // Allows multiple users who haven't linked Discord to not conflict.
  },
  avatar: {
    type: String,
  },
  profilePics: {
    type: [String],
    default: [],
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otpExpiresAt: {
    type: Date,
  },
  isOnboarded: {
    type: Boolean,
    default: false,
  },
  fullname: {
    type: String,
    trim: true,
  },
  gender: {
    type: String,
    trim: true,
  },
  age: {
    type: Number,
  },
  location: {
    type: String,
    trim: true,
  },
  locationDetails: {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    }
  },
  bio: {
    type: String,
    trim: true,
  },
  isProfileCompleted: {
    type: Boolean,
    default: false,
  },
  // ── "More About You" lifestyle fields (all optional) ──
  height: { type: String, trim: true },
  weight: { type: String, trim: true },
  education: { type: String, trim: true },
  drinking: { type: String, trim: true },
  smoking: { type: String, trim: true },
  lookingFor: { type: String, trim: true },
  kids: { type: String, trim: true },
  politics: { type: String, trim: true },
  religion: { type: String, trim: true },
  discord: { type: String, trim: true },
  instagram: { type: String, trim: true },
  preferences: {
    path: {
      type: String,
      enum: ["anime", "game", "both"],
    },
    animeGenres: [{
      _id: false,
      ref: { type: mongoose.Schema.Types.ObjectId, ref: "AnimeCategory" },
      name: { type: String },
      slug: { type: String },
    }],
    gameGenres: [{
      _id: false,
      ref: { type: mongoose.Schema.Types.ObjectId, ref: "GameCategory" },
      name: { type: String },
      slug: { type: String },
    }],
    animeFavorites: [{
      _id: false,
      ref: { type: mongoose.Schema.Types.ObjectId, ref: "AnimeTitle" },
      title: { type: String },
    }],
    gameFavorites: [{
      _id: false,
      ref: { type: mongoose.Schema.Types.ObjectId, ref: "GameTitle" },
      title: { type: String },
    }],
  },
  synergy: {
    type: Number,
    default: 0,
  },
  referredBy: {
    type: String,
    trim: true,
  },
  complimentsBalance: {
    type: Number,
    default: 1, // Free users get 1 free compliment upon registration
  },
  extraSwipesBalance: {
    type: Number,
    default: 0,
  },
  superLikesBalance: {
    type: Number,
    default: 1, // Free users get 1 free super like
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  activeSubscription: {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    planId: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
    },
    purchasedAt: {
      type: Date,
    },
  },
}, {
  timestamps: true,
});

userSchema.index({ "locationDetails.coordinates": "2dsphere" });
userSchema.index({ isOnboarded: 1, "preferences.path": 1 });

const User = mongoose.model("User", userSchema);
export default User;
