import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../Models/user.schema.js";

const getAccessSecret = () => process.env.JWT_SECRET || "fallback_secret";
const getRefreshSecret = () =>
  process.env.JWT_REFRESH_SECRET ||
  (process.env.JWT_SECRET ? process.env.JWT_SECRET + "_refresh_secret" : "fallback_refresh_secret");

/**
 * Generates a Short-Lived Access Token (15 minutes).
 * @param {string} userId - The MongoDB User ID.
 * @returns {string} The signed JWT Access Token.
 */
export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId.toString(), type: "access" }, getAccessSecret(), {
    expiresIn: "15m",
  });
};

/**
 * Generates a Long-Lived Refresh Token (30 days).
 * @param {string} userId - The MongoDB User ID.
 * @returns {string} The signed JWT Refresh Token.
 */
export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId.toString(), type: "refresh" }, getRefreshSecret(), {
    expiresIn: "30d",
  });
};

/**
 * Generates both Access Token and Refresh Token.
 * @param {string} userId - The MongoDB User ID.
 * @returns {{ token: string, refreshToken: string }}
 */
export const generateAuthTokens = (userId) => {
  const token = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);
  return { token, refreshToken };
};

/**
 * Backward-compatible helper returning Access Token.
 * @param {string} userId - The MongoDB User ID.
 * @returns {string} The signed JWT Access Token.
 */
export const generateToken = (userId) => {
  return generateAccessToken(userId);
};

/**
 * Verifies a Refresh Token.
 * @param {string} refreshToken - The JWT Refresh Token.
 * @returns {object|null} The decoded token payload or null if invalid/expired.
 */
export const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, getRefreshSecret());
    if (decoded.type !== "refresh") return null;
    return decoded;
  } catch (err) {
    return null;
  }
};

export const generateUserId = async () => {
  let prefix = "OTK_";
  let exist = true;
  let userId;
  while (exist) {
    const random = crypto.randomBytes(8).toString("hex");
    userId = prefix + random;
    if (!(await User.findOne({ userId }))) {
      exist = false;
      return userId;
    }
  }
};