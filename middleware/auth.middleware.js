import jwt from "jsonwebtoken";
import dbCommonQuery from "../utils/dbCommonQuery.js";

export const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ status: false, message: "Unauthorized user" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: decoded.id,
      projection: "-password",
      lean: true
    });

    if (!user) {
      return res.status(401).json({ status: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ status: false, message: "Unauthorized user" });
  }
};

export const requireOnboarded = (req, res, next) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      status: false,
      message: "Unauthorized."
    });
  }

  const preferences = user.preferences || {};

  const hasPreferences =
    (preferences.animeGenres?.length || 0) > 0 ||
    (preferences.gameGenres?.length || 0) > 0 ||
    (preferences.animeFavorites?.length || 0) > 0 ||
    (preferences.gameFavorites?.length || 0) > 0;

  if (!user.isOnboarded || !hasPreferences) {
    return res.status(403).json({
      status: false,
      message: "Complete onboarding before performing this action."
    });
  }

  next();
};
