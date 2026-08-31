import bcrypt from "bcryptjs";
import User from "../Models/user.schema.js";
import { generateUserId } from "./jwt.js";

/**
 * Ensures at least one admin account exists in the database.
 * If no admin is found, creates default admin: admin@otakuduo.com / Admin@123456
 */
export const ensureAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      return;
    }

    const defaultAdminEmail = (process.env.ADMIN_EMAIL || "admin@otakuduo.com").toLowerCase().trim();
    const defaultAdminPassword = process.env.ADMIN_PASSWORD || "Admin@123456";

    let adminUser = await User.findOne({ email: defaultAdminEmail });

    if (adminUser) {
      adminUser.role = "admin";
      adminUser.isVerified = true;
      adminUser.isOnboarded = true;
      if (!adminUser.password) {
        const salt = await bcrypt.genSalt(10);
        adminUser.password = await bcrypt.hash(defaultAdminPassword, salt);
      }
      await adminUser.save();
      console.log(`[Admin Seed] Existing account ${defaultAdminEmail} promoted to Admin.`);
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultAdminPassword, salt);
      const userId = await generateUserId();

      await User.create({
        email: defaultAdminEmail,
        password: hashedPassword,
        fullname: "System Administrator",
        username: "OtakuAdmin",
        userId,
        role: "admin",
        isVerified: true,
        isOnboarded: true,
        isProfileCompleted: true,
        complimentsBalance: 9999,
        superLikesBalance: 9999,
        extraSwipesBalance: 9999,
        isPremium: true,
      });

      console.log("====================================================");
      console.log(" [Admin Seed] Default Admin Account Initialized!");
      console.log(` Email:    ${defaultAdminEmail}`);
      console.log(` Password: ${defaultAdminPassword}`);
      console.log("====================================================");
    }
  } catch (error) {
    console.error("[Admin Seed] Error ensuring admin user:", error);
  }
};

export default ensureAdminUser;
