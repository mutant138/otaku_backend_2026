import bcrypt from "bcryptjs";
import dbCommonQuery from "../../utils/dbCommonQuery.js";
import { generateToken } from "../../utils/jwt.js";
import { buildUserResponse } from "../../utils/userHelper.js";

/**
 * Admin Login
 * POST /api/admin/auth/login
 */
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: false,
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Invalid email or password.",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        status: false,
        message: "This account has no password set. Please use password authentication.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Invalid email or password.",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Access forbidden: Account does not possess administrative privileges.",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      status: true,
      message: "Admin login successful.",
      token,
      admin: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error during admin login.",
    });
  }
};

/**
 * Get Current Authenticated Admin
 * GET /api/admin/auth/me
 */
export const getAdminMe = async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      admin: buildUserResponse(req.admin),
    });
  } catch (error) {
    console.error("Get Admin Me Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error retrieving admin profile.",
    });
  }
};
