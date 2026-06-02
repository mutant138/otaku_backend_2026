import jwt from "jsonwebtoken";
import crypto from 'crypto'
import User from "../Models/user.schema.js";
/**
 * Generates a JSON Web Token for the user.
 * @param {string} userId - The MongoDB User ID.
 * @returns {string} The signed JWT.
 */
export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });
};

export const generateUserId = async () => {
  let prefix = "OTK_"
  let exist = true
  let userId;
  while(exist){
    const random = crypto.randomBytes(8).toString("hex");
    userId = prefix + random;
    if(!(await User.findOne({userId}))){
      exist = false;
      return userId;
    }
  }
};