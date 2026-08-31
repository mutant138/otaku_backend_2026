import jwt from "jsonwebtoken";
import dbCommonQuery from "../utils/dbCommonQuery.js";

/**
 * Middleware to protect routes that require Admin privileges.
 */
export const protectAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: No token provided.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    } catch (err) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: Invalid or expired token.",
      });
    }

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: decoded.id,
      projection: "-password",
      lean: true,
    });

    if (!user) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized: Admin user not found.",
      });
    }

    if (user.role !== "admin") {
      return res.status(403).json({
        status: false,
        message: "Forbidden: You do not have administrative privileges.",
      });
    }

    req.admin = user;
    req.user = user;
    next();
  } catch (error) {
    console.error("Admin Protect Middleware Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error during admin verification.",
    });
  }
};
