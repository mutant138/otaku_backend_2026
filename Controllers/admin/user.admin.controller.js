import bcrypt from "bcryptjs";
import dbCommonQuery from "../../utils/dbCommonQuery.js";
import { generateUserId } from "../../utils/jwt.js";
import { generateRandomUsername, buildUserResponse } from "../../utils/userHelper.js";

/**
 * Get All Users with Search, Filtering & Pagination
 * GET /api/admin/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const { q, role, isVerified, isPremium, isBot, isOnboarded } = req.query;
    const filter = {};

    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { fullname: regex },
        { username: regex },
        { email: regex },
        { userId: regex },
      ];
    }

    if (role) filter.role = role;
    if (isVerified !== undefined && isVerified !== "") filter.isVerified = isVerified === "true";
    if (isPremium !== undefined && isPremium !== "") filter.isPremium = isPremium === "true";
    if (isBot !== undefined && isBot !== "") filter.isBot = isBot === "true";
    if (isOnboarded !== undefined && isOnboarded !== "") filter.isOnboarded = isOnboarded === "true";

    const [users, total] = await Promise.all([
      dbCommonQuery({
        model: "User",
        action: "find",
        filter,
        sort: { createdAt: -1 },
        skip,
        limit,
        lean: true,
      }),
      dbCommonQuery({
        model: "User",
        action: "countDocuments",
        filter,
      }),
    ]);

    const sanitizedUsers = users.map((u) => buildUserResponse(u));

    return res.status(200).json({
      status: true,
      data: {
        users: sanitizedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch users list.",
    });
  }
};

/**
 * Get User By ID
 * GET /api/admin/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: id,
      lean: true,
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      status: true,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Get User By ID Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve user details.",
    });
  }
};

/**
 * Create New User (Admin creation)
 * POST /api/admin/users
 */
export const createUser = async (req, res) => {
  try {
    const {
      fullname,
      email,
      password,
      username,
      role = "user",
      isVerified = true,
      isOnboarded = true,
      isBot = false,
      isPremium = false,
      gender,
      age,
      location,
      bio,
      complimentsBalance = 1,
      superLikesBalance = 1,
      extraSwipesBalance = 0,
    } = req.body;

    if (!email) {
      return res.status(400).json({
        status: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: true,
    });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: "A user with this email already exists.",
      });
    }

    let hashedPassword = undefined;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const assignedUsername = username?.trim() || (await generateRandomUsername());
    const userId = await generateUserId();

    const newUser = await dbCommonQuery({
      model: "User",
      action: "create",
      data: {
        fullname: fullname?.trim() || "",
        email: normalizedEmail,
        password: hashedPassword,
        username: assignedUsername,
        userId,
        role: role === "admin" ? "admin" : "user",
        isVerified: Boolean(isVerified),
        isOnboarded: Boolean(isOnboarded),
        isProfileCompleted: Boolean(isOnboarded),
        isBot: Boolean(isBot),
        isPremium: Boolean(isPremium),
        gender: gender || "",
        age: age ? Number(age) : undefined,
        location: location || "",
        bio: bio || "",
        complimentsBalance: Number(complimentsBalance) || 0,
        superLikesBalance: Number(superLikesBalance) || 0,
        extraSwipesBalance: Number(extraSwipesBalance) || 0,
      },
    });

    return res.status(201).json({
      status: true,
      message: "User created successfully.",
      user: buildUserResponse(newUser),
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to create user.",
    });
  }
};

/**
 * Update User
 * PUT /api/admin/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullname,
      username,
      email,
      role,
      isVerified,
      isOnboarded,
      isBot,
      isPremium,
      gender,
      age,
      location,
      bio,
      complimentsBalance,
      superLikesBalance,
      extraSwipesBalance,
      password,
    } = req.body;

    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: id,
      lean: false,
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found.",
      });
    }

    if (fullname !== undefined) user.fullname = fullname.trim();
    if (username !== undefined) user.username = username.trim();
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (role !== undefined) user.role = role;
    if (isVerified !== undefined) user.isVerified = Boolean(isVerified);
    if (isOnboarded !== undefined) user.isOnboarded = Boolean(isOnboarded);
    if (isBot !== undefined) user.isBot = Boolean(isBot);
    if (isPremium !== undefined) user.isPremium = Boolean(isPremium);
    if (gender !== undefined) user.gender = gender;
    if (age !== undefined) user.age = Number(age);
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;

    if (complimentsBalance !== undefined) user.complimentsBalance = Math.max(0, Number(complimentsBalance));
    if (superLikesBalance !== undefined) user.superLikesBalance = Math.max(0, Number(superLikesBalance));
    if (extraSwipesBalance !== undefined) user.extraSwipesBalance = Math.max(0, Number(extraSwipesBalance));

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();

    return res.status(200).json({
      status: true,
      message: "User updated successfully.",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Update User Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update user.",
    });
  }
};

/**
 * Delete User
 * DELETE /api/admin/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (req.admin && req.admin._id.toString() === id) {
      return res.status(400).json({
        status: false,
        message: "You cannot delete your own admin account.",
      });
    }

    const deleted = await dbCommonQuery({
      model: "User",
      action: "findByIdAndDelete",
      filter: id,
    });

    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: "User not found or already deleted.",
      });
    }

    // Clean up user's reports & swipes
    await Promise.all([
      dbCommonQuery({
        model: "Report",
        action: "deleteMany",
        filter: { $or: [{ reporter: id }, { reportedUser: id }] },
      }),
      dbCommonQuery({
        model: "Swipe",
        action: "deleteMany",
        filter: { $or: [{ swiper: id }, { target: id }] },
      }),
    ]);

    return res.status(200).json({
      status: true,
      message: "User and associated records deleted successfully.",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to delete user.",
    });
  }
};
