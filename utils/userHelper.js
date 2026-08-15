import dbCommonQuery from "./dbCommonQuery.js";

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const ANIME_PREFIXES = [
  "Shinobi", "Saiyan", "Ghoul", "Titan", "Jujutsu", "Hokage", "Bankai", "Tsundere", "Yandere", "Senpai",
  "Kouhai", "Otaku", "Weeb", "Chibi", "Neko", "Kawaii", "Shounen", "Shojo", "Isekai", "Nakama",
  "Jutsu", "Sharingan", "Rasengan", "Kamehameha", "DeathNote", "Geass", "StrawHat", "Goku", "Naruto", "Luffy"
];

export const GAME_SUFFIXES = [
  "Gamer", "Pixel", "Glitch", "Mage", "Rogue", "Paladin", "Warrior", "Healer", "Sniper", "Camper",
  "Noob", "Pro", "Speedrunner", "Controller", "Joystick", "Quest", "Boss", "NPC", "Frag", "Guild",
  "Loot", "Spawn", "Respawn", "Mana", "Stealth", "Modder", "Arcade", "Console", "Steam", "Xbox"
];

export const generateRandomUsername = async () => {
  let isUnique = false;
  let username = "";
  while (!isUnique) {
    const prefix = ANIME_PREFIXES[Math.floor(Math.random() * ANIME_PREFIXES.length)];
    const suffix = GAME_SUFFIXES[Math.floor(Math.random() * GAME_SUFFIXES.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    username = `${prefix}${suffix}${randomNum}`;
    const existing = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { username },
      lean: true
    });
    if (!existing) {
      isUnique = true;
    }
  }
  return username;
};

export function buildUserResponse(user) {
  if (!user) return null;
  let isPremium = user.isPremium || false;

  if (user.activeSubscription && user.activeSubscription.expiresAt) {
    const isExpired = new Date(user.activeSubscription.expiresAt) < new Date();
    if (isExpired) {
      isPremium = false;
      if (user.isPremium && typeof user.save === "function") {
        user.isPremium = false;
        user.save().catch(err => console.error("Error auto-updating expired subscription:", err));
      } else if (user.isPremium) {
        dbCommonQuery({
          model: "User",
          action: "updateOne",
          filter: { _id: user._id },
          data: { isPremium: false }
        }).catch(err => console.error("Error auto-updating expired subscription via dbCommonQuery:", err));
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
    synergy: user.synergy || 0,
    referredBy: user.referredBy || "",
    height: user.height || "",
    weight: user.weight || "",
    education: user.education || "",
    drinking: user.drinking || "",
    smoking: user.smoking || "",
    lookingFor: user.lookingFor || "",
    kids: user.kids || "",
    politics: user.politics || "",
    discord: user.discord || "",
    instagram: user.instagram || "",
    complimentsBalance: user.complimentsBalance !== undefined ? user.complimentsBalance : 1,
    extraSwipesBalance: user.extraSwipesBalance || 0,
    superLikesBalance: user.superLikesBalance !== undefined ? user.superLikesBalance : 1,
    isPremium,
    activeSubscription: user.activeSubscription || null,
  };
}

export function buildPublicUserResponse(user) {
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
    height: user.height || "",
    weight: user.weight || "",
    education: user.education || "",
    drinking: user.drinking || "",
    smoking: user.smoking || "",
    lookingFor: user.lookingFor || "",
    kids: user.kids || "",
    politics: user.politics || "",
    discord: user.discord || "",
    instagram: user.instagram || "",
    synergy: user.synergy || 0,
    isPremium
  };
}
