import * as authController from "./auth.controller.js";
import * as profileController from "./profile.controller.js";
import * as matchmakingController from "./matchmaking.controller.js";
import * as chatController from "./chat.controller.js";
import * as paymentController from "./payment.controller.js";

// Re-export all named controller methods for backward compatibility
export const checkEmail = authController.checkEmail;
export const registerUser = authController.registerUser;
export const verifyOtp = authController.verifyOtp;
export const resendOtp = authController.resendOtp;
export const loginUser = authController.loginUser;
export const oauthLoginOrSignup = authController.oauthLoginOrSignup;
export const forgotPassword = authController.forgotPassword;
export const resetPassword = authController.resetPassword;
export const generateUsername = authController.generateUsername;
export const getMe = authController.getMe;

export const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }

    const {
      fullname, email, gender, age, location, locationDetails, bio, username,
      height, weight, education, drinking, smoking, lookingFor, kids, politics, discord, instagram
    } = req.body;

    if (email && email.toLowerCase().trim() !== user.email) {
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ status: false, message: "Email is already in use by another user" });
      }
      user.email = normalizedEmail;
    }

    if (username && username.trim() !== user.username) {
      const normalizedUsername = username.trim();
      const existingUser = await User.findOne({ username: normalizedUsername });
      if (existingUser) {
        return res.status(400).json({ status: false, message: "Username is already taken" });
      }
      user.username = normalizedUsername;
      if (!user.avatar || user.avatar.startsWith("https://api.dicebear.com/")) {
        user.avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${normalizedUsername}`;
      }
    }

    // Mandatory fields
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

    // Optional "More About You" fields
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

    // Mark profile as completed if all mandatory fields are filled
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

// Upload single avatar
export const uploadAvatar = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: "No file uploaded" });
    }

    // Delete old avatar from disk if custom
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

// Upload photo to profilePics array (up to 6 photos)
export const uploadPhoto = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    if (!req.file) {
      return res.status(400).json({ status: false, message: "No file uploaded" });
    }

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

// Delete photo from profilePics array
export const deletePhoto = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ status: false, message: "Unauthorized user" });
    }
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(400).json({ status: false, message: "Photo URL is required" });
    }

    if (user.isOnboarded && user.profilePics.length <= 1 && user.profilePics.includes(photoUrl)) {
      return res.status(400).json({ status: false, message: "You must keep at least one profile photo." });
    }

    user.profilePics = user.profilePics.filter(pic => pic !== photoUrl);
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
    const countries = await Country.find({}).sort({ name: 1 });
    return res.status(200).json({ status: true, countries });
  } catch (error) {
    console.error("Get Countries Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getStates = async (req, res) => {
  try {
    const { countryId } = req.params;
    const states = await State.find({ country: countryId }).sort({ name: 1 });
    return res.status(200).json({ status: true, states });
  } catch (error) {
    console.error("Get States Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getCities = async (req, res) => {
  try {
    const { stateId } = req.params;
    const cities = await City.find({ state: stateId }).sort({ name: 1 });
    return res.status(200).json({ status: true, cities });
  } catch (error) {
    console.error("Get Cities Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getCandidates = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all users the current user has permanently swiped on (likes and super-likes)
    const permanentExcludes = await Swipe.find({
      swiper: currentUserId,
      swipeType: { $in: ["like", "super"] }
    }).distinct("swipee");

    // Find recent passes (within the last 3 days) to exclude
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const recentPasses = await Swipe.find({
      swiper: currentUserId,
      swipeType: "pass",
      createdAt: { $gte: threeDaysAgo }
    }).distinct("swipee");

    // Find users whom this user has reported, or who have reported this user
    const [reportedByMe, reportedMe] = await Promise.all([
      Report.find({ reporter: currentUserId }).distinct("reportedUser"),
      Report.find({ reportedUser: currentUserId }).distinct("reporter")
    ]);

    // Combine permanent exclusions, recent passes, and reports
    const excludedUserIds = [...new Set([...permanentExcludes, ...recentPasses, ...reportedByMe, ...reportedMe])];

    // Construct query based on logged-in user's preference path (anime/game/both)
    const userPath = req.user.preferences?.path || "both";
    const query = {
      _id: { $ne: currentUserId, $nin: excludedUserIds },
      isOnboarded: true
    };

    if (userPath === "anime") {
      query["preferences.path"] = { $in: ["anime", "both"] };
    } else if (userPath === "game") {
      query["preferences.path"] = { $in: ["game", "both"] };
    }

    // Find candidates matching the query with a limit of 40 to optimize database load
    const users = await User.find(query)
      .select("username avatar profilePics isVerified fullname gender age location bio preferences height weight education drinking smoking lookingFor kids politics isPremium activeSubscription userId")
      .limit(40);
    
    const hasSubscription = req.user.activeSubscription &&
                            req.user.activeSubscription.expiresAt &&
                            new Date(req.user.activeSubscription.expiresAt) > new Date();

    // Calculate swipes left today (5 limit per calendar day in UTC)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todaySwipesCount = await Swipe.countDocuments({
      swiper: currentUserId,
      createdAt: { $gte: startOfDay }
    });

    const swipesLeft = hasSubscription ? 9999 : Math.max(0, 5 - todaySwipesCount) + (req.user.extraSwipesBalance || 0);
    const resetTime = new Date();
    resetTime.setUTCHours(24, 0, 0, 0); // Midnight UTC

    const candidates = users.map(user => buildPublicUserResponse(user));
    return res.status(200).json({
      status: true,
      candidates,
      swipesLeft,
      resetTime
    });
  } catch (error) {
    console.error("Get Candidates Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const swipeUser = async (req, res) => {
  try {
    const swiperId = req.user._id;
    const { swipeeId, swipeType, compliment } = req.body;

    if (!swipeeId || !swipeType) {
      return res.status(400).json({ status: false, message: "Swipee ID and swipe type are required" });
    }

    if (!["like", "pass", "super"].includes(swipeType)) {
      return res.status(400).json({ status: false, message: "Invalid swipe type" });
    }

    // Check if target user exists
    const swipee = await User.findById(swipeeId);
    if (!swipee) {
      return res.status(404).json({ status: false, message: "Target user not found" });
    }

    // Check compliment limit if a compliment is being sent
    if (compliment && compliment.trim()) {
      const isPremium = req.user.isPremium || false;
      const balance = req.user.complimentsBalance !== undefined ? req.user.complimentsBalance : 1;

      if (!isPremium && balance <= 0) {
        return res.status(403).json({
          status: false,
          needsSubscription: true,
          message: "You have depleted your free compliment! A subscription or paid refill is required to transmit more compliments."
        });
      }
    }

    // Check if already swiped on this user
    const existingSwipe = await Swipe.findOne({ swiper: swiperId, swipee: swipeeId });
    if (existingSwipe) {
      if (existingSwipe.swipeType === "pass") {
        // Reuse the existing pass swipe and update it later
        existingSwipe.swipeType = swipeType;
        existingSwipe.createdAt = new Date();
      } else {
        return res.status(400).json({ status: false, message: "You have already swiped on this user" });
      }
    }

    const user = req.user;
    const hasSubscription = user.activeSubscription &&
                            user.activeSubscription.expiresAt &&
                            new Date(user.activeSubscription.expiresAt) > new Date();
    let userModified = false;

    if (swipeType === "super") {
      if (!hasSubscription) {
        const superBalance = user.superLikesBalance !== undefined ? user.superLikesBalance : 1;
        if (superBalance <= 0) {
          return res.status(403).json({
            status: false,
            needsRefill: true,
            message: "Super Likes depleted! Please purchase a plan or refill to get more."
          });
        }
        user.superLikesBalance = Math.max(0, superBalance - 1);
        userModified = true;
      }
    }

    // Check daily limit (5 swipes per UTC day + extra swipes)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const todaySwipesCount = await Swipe.countDocuments({
      swiper: swiperId,
      createdAt: { $gte: startOfDay }
    });

    const resetTime = new Date();
    resetTime.setUTCHours(24, 0, 0, 0);

    const isLimitExceeded = todaySwipesCount >= 5 && (user.extraSwipesBalance || 0) <= 0;

    if (!hasSubscription && isLimitExceeded) {
      return res.status(403).json({
        status: false,
        limitReached: true,
        message: "Radar calibration energy depleted! Daily swipe limit reached. Please wait for the next radar refresh or purchase a refill.",
        resetTime,
        swipesLeft: 0
      });
    }

    // Record/update swipe
    if (existingSwipe) {
      await existingSwipe.save();
    } else {
      const newSwipe = new Swipe({
        swiper: swiperId,
        swipee: swipeeId,
        swipeType,
      });
      await newSwipe.save();
    }

    // Hook for Welcome Bot instant match response (Strategy 4)
    if (swipee.isBot && ["like", "super"].includes(swipeType)) {
      // Create reverse swipe from Bot to User if it doesn't already exist (fail-safe)
      const botSwipeExists = await Swipe.findOne({ swiper: swipeeId, swipee: swiperId });
      if (!botSwipeExists) {
        await Swipe.create({
          swiper: swipeeId,
          swipee: swiperId,
          swipeType: "like"
        });
      }

      // Check if a welcome message has already been sent to avoid duplicates
      const welcomeMsgExists = await Message.findOne({ sender: swipeeId, receiver: swiperId });
      if (!welcomeMsgExists) {
        const welcomeMessage = new Message({
          sender: swipeeId,
          receiver: swiperId,
          content: "Hi! Welcome to OtakuDuo. I'm Jarvis, your system guide. I can help you calibrate your credentials, search for other players, or just keep you company. What anime or game are you currently hyperfocused on?",
          isRead: false,
        });
        await welcomeMessage.save();
      }
    }

    // Deduct extra swipes if daily limit exceeded
    if (!hasSubscription && todaySwipesCount >= 5) {
      user.extraSwipesBalance = Math.max(0, (user.extraSwipesBalance || 0) - 1);
      userModified = true;
    }

    // If a compliment is provided, store it as a Message document
    if (compliment && compliment.trim()) {
      const newMessage = new Message({
        sender: swiperId,
        receiver: swipeeId,
        content: compliment.trim(),
        isRead: false,
      });
      await newMessage.save();

      // Deduct compliments balance if user is not premium
      if (!user.isPremium) {
        user.complimentsBalance = Math.max(0, (user.complimentsBalance || 1) - 1);
        userModified = true;
      }
    }

    if (userModified) {
      await user.save();
    }

    const newSwipesLeft = hasSubscription ? 9999 : Math.max(0, 5 - (todaySwipesCount + 1)) + (user.extraSwipesBalance || 0);

    return res.status(201).json({
      status: true,
      message: "Swipe recorded successfully",
      swipesLeft: newSwipesLeft,
      resetTime,
      complimentsBalance: user.complimentsBalance !== undefined ? user.complimentsBalance : 1,
    });
  } catch (error) {
    console.error("Swipe User Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const reportUser = async (req, res) => {
  try {
    const reporter = req.user._id;
    const { reportedUserId, reason, details } = req.body;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ status: false, message: "Reported user ID and reason are required" });
    }

    // Check for duplicate reports
    const existingReport = await Report.findOne({ reporter, reportedUser: reportedUserId });
    if (existingReport) {
      return res.status(400).json({ status: false, message: "You have already reported this user" });
    }

    const report = new Report({
      reporter,
      reportedUser: reportedUserId,
      reason,
      details,
    });

    await report.save();

    return res.status(201).json({ status: true, message: "User reported successfully" });
  } catch (error) {
    console.error("Report User Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

const DEFAULT_PLANS = [
  {
    planId: "mana-drop",
    name: "Mana Drop",
    price: 49,
    originalPrice: 99,
    description: "Quick refill for active explorers.",
    type: "refill",
    durationDays: 0,
    benefits: [
      { text: "15 Extra Swipes", iconName: "FaGamepad" },
      { text: "2 Compliments", iconName: "FaStar" },
      { text: "1 Super Like", iconName: "FaFire" }
    ],
    complimentsRefill: 2,
    isPremium: false,
  },
  {
    planId: "power-surge",
    name: "Power Surge",
    price: 99,
    originalPrice: 199,
    description: "Unleash your energy for 24 hours.",
    type: "subscription",
    durationDays: 1,
    benefits: [
      { text: "Unlimited Swipes for 24 Hours", iconName: "FaBolt" },
      { text: "4 Direct Messages", iconName: "FaRocket" },
      { text: "3 Super Likes", iconName: "FaStar" }
    ],
    complimentsRefill: 4,
    isPremium: false,
  },
  {
    planId: "otaku-pass",
    name: "Otaku Pass",
    price: 143,
    originalPrice: 299,
    description: "Unlock your full anime and gaming potential. (Weekly Reset)",
    type: "subscription",
    durationDays: 7,
    benefits: [
      { text: "Unlimited Swipes", iconName: "FaBolt" },
      { text: "Spotlight Profile", iconName: "FaStar" },
      { text: "10 Messages per Week", iconName: "FaRocket" },
      { text: "5 Super Likes per Week", iconName: "FaFire" }
    ],
    complimentsRefill: 10,
    isPremium: true,
  }
];

export const getPlans = async (req, res) => {
  try {
    let plans = await Plan.find({});
    if (plans.length === 0) {
      plans = await Plan.insertMany(DEFAULT_PLANS);
    }
    return res.status(200).json({ status: true, plans });
  } catch (error) {
    console.error("Get Plans Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const createOrder = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ status: false, message: "Plan ID is required" });
    }

    let plan = await Plan.findOne({ planId });
    if (!plan) {
      // Seed default plans if not seeded yet
      const count = await Plan.countDocuments({});
      if (count === 0) {
        await Plan.insertMany(DEFAULT_PLANS);
        plan = await Plan.findOne({ planId });
      }
    }

    if (!plan) {
      return res.status(404).json({ status: false, message: "Subscription plan not found" });
    }

    const amount = plan.price * 100; // convert INR to paise

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        planId: planId,
      },
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      return res.status(500).json({ status: false, message: "Failed to create Razorpay order" });
    }

    // Save pending payment record in DB so server can track processing status even if client localStorage is cleared
    const paymentLog = new Payment({
      user: req.user._id,
      planId,
      razorpay_payment_id: `pending_${order.id}`,
      razorpay_order_id: order.id,
      razorpay_signature: "pending",
      amount,
      status: "created",
    });
    await paymentLog.save();

    return res.status(201).json({
      status: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      planId,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Helper function to apply subscription plan benefits to a user.
 */
export const fulfillSubscriptionPlan = (user, plan) => {
  const isGirl = user.gender && ["female", "girl", "woman"].includes(user.gender.toLowerCase().trim());
  const multiplier = isGirl ? 2 : 1;

  // Apply compliments refill
  const complimentsAdded = (plan.complimentsRefill || 0) * multiplier;
  user.complimentsBalance = (user.complimentsBalance !== undefined ? user.complimentsBalance : 1) + complimentsAdded;

  // Apply extra swipes if any
  let extraSwipesAdded = 0;
  if (plan.planId === "mana-drop") {
    extraSwipesAdded = 15 * multiplier;
    user.extraSwipesBalance = (user.extraSwipesBalance || 0) + extraSwipesAdded;
  }

  // Apply super likes if any
  let superLikesAdded = 0;
  if (plan.planId === "mana-drop") {
    superLikesAdded = 1 * multiplier;
  } else if (plan.planId === "power-surge") {
    superLikesAdded = 3 * multiplier;
  } else if (plan.planId === "otaku-pass") {
    superLikesAdded = 5 * multiplier;
  }
  user.superLikesBalance = (user.superLikesBalance !== undefined ? user.superLikesBalance : 1) + superLikesAdded;

  // Apply premium features if plan grants them
  if (plan.isPremium) {
    user.isPremium = true;
  }

  // Record subscription limits if it's a subscription type
  if (plan.type === "subscription" && plan.durationDays > 0) {
    const purchasedAt = new Date();
    const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
    user.activeSubscription = {
      plan: plan._id,
      planId: plan.planId,
      purchasedAt,
      expiresAt,
    };
  }

  return user;
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId) {
      return res.status(400).json({ status: false, message: "All payment credentials are required" });
    }

    const plan = await Plan.findOne({ planId });
    if (!plan) {
      return res.status(404).json({ status: false, message: "Plan not found" });
    }

    // Verify signature using HMAC SHA256
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const signatureBuffer = Buffer.from(razorpay_signature, "hex");

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return res.status(400).json({ status: false, message: "Transaction verification failed. Signature mismatch." });
    }

    const user = req.user;
    
    // Fulfill subscription plan benefits
    fulfillSubscriptionPlan(user, plan);
    await user.save();

    // Store/update payment transaction in MongoDB
    let paymentLog = await Payment.findOne({ razorpay_order_id });
    if (paymentLog) {
      paymentLog.razorpay_payment_id = razorpay_payment_id;
      paymentLog.razorpay_signature = razorpay_signature;
      paymentLog.status = "verified";
      await paymentLog.save();
    } else {
      paymentLog = new Payment({
        user: user._id,
        planId,
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        amount: plan.price * 100,
        status: "verified",
      });
      await paymentLog.save();
    }

    return res.status(200).json({
      status: true,
      message: "Payment successfully verified and benefits applied!",
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Handle incoming Razorpay Webhook notifications for payments and subscriptions.
 * Route: POST /api/user/razorpay-webhook
 */
export const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "otaku_razorpay_webhook_secret_2026";
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.status(400).json({ status: false, message: "Missing Razorpay webhook signature header" });
    }

    // Get raw body buffer for HMAC verification
    const rawBody = req.rawBody
      ? req.rawBody
      : (typeof req.body === "string" ? Buffer.from(req.body) : Buffer.from(JSON.stringify(req.body)));

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const signatureBuffer = Buffer.from(signature, "utf8");

    if (
      expectedBuffer.length !== signatureBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
    ) {
      return res.status(400).json({ status: false, message: "Webhook signature verification failed" });
    }

    const payload = req.body;
    const event = payload?.event;
    console.log(`[Razorpay Webhook] Received event: ${event}`);

    // Process payment capture/authorization, order paid, or subscription charged/authenticated events
    if (["payment.captured", "payment.authorized", "order.paid", "subscription.charged", "subscription.authenticated"].includes(event)) {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderEntity = payload.payload?.order?.entity || {};
      const subscriptionEntity = payload.payload?.subscription?.entity || {};

      const razorpay_payment_id = paymentEntity.id || payload.payload?.payment_id || `webhook_${Date.now()}`;
      const razorpay_order_id = paymentEntity.order_id || orderEntity.id || subscriptionEntity.id;
      const notes = paymentEntity.notes || orderEntity.notes || subscriptionEntity.notes || {};

      const userId = notes.userId;
      const planId = notes.planId;

      // Idempotency check: verify if payment was already recorded
      let existingPayment = null;
      if (razorpay_payment_id) {
        existingPayment = await Payment.findOne({ razorpay_payment_id, status: "verified" });
      }
      if (!existingPayment && razorpay_order_id) {
        existingPayment = await Payment.findOne({ razorpay_order_id, status: "verified" });
      }

      if (existingPayment) {
        return res.status(200).json({ status: true, message: "Payment already processed and verified." });
      }

      if (!userId || !planId) {
        return res.status(200).json({ status: true, message: "Webhook received but missing order notes (userId / planId)" });
      }

      const user = await User.findById(userId);
      const plan = await Plan.findOne({ planId });

      if (user && plan) {
        fulfillSubscriptionPlan(user, plan);
        await user.save();

        let paymentLog = await Payment.findOne({ razorpay_order_id });
        if (paymentLog) {
          paymentLog.razorpay_payment_id = razorpay_payment_id;
          paymentLog.razorpay_signature = signature;
          paymentLog.status = "verified";
          await paymentLog.save();
        } else {
          paymentLog = new Payment({
            user: user._id,
            planId: plan.planId,
            razorpay_payment_id,
            razorpay_order_id: razorpay_order_id || `order_wh_${Date.now()}`,
            razorpay_signature: signature,
            amount: paymentEntity.amount || (plan.price * 100),
            status: "verified",
          });
          await paymentLog.save();
        }

        return res.status(200).json({ status: true, message: "Webhook payment fulfilled successfully!" });
      }
    } else if (["subscription.cancelled", "subscription.halted"].includes(event)) {
      const subscriptionEntity = payload.payload?.subscription?.entity || {};
      const notes = subscriptionEntity.notes || {};
      const userId = notes.userId;

      if (userId) {
        const user = await User.findById(userId);
        if (user && user.activeSubscription) {
          // Expire current active subscription
          user.activeSubscription.expiresAt = new Date();
          await user.save();
        }
      }
      return res.status(200).json({ status: true, message: "Subscription cancellation/halt processed" });
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const notes = paymentEntity.notes || {};
      const userId = notes.userId;
      const planId = notes.planId;

      if (userId && planId) {
        const paymentLog = new Payment({
          user: userId,
          planId,
          razorpay_payment_id: paymentEntity.id || `failed_${Date.now()}`,
          razorpay_order_id: paymentEntity.order_id || `order_failed_${Date.now()}`,
          razorpay_signature: signature,
          amount: paymentEntity.amount || 0,
          status: "failed",
        });
        await paymentLog.save();
      }
      return res.status(200).json({ status: true, message: "Payment failure logged successfully" });
    }

    return res.status(200).json({ status: true, message: "Webhook event acknowledged" });
  } catch (error) {
    console.error("Razorpay Webhook Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getLobbyLikes = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Swipes made by current user
    const swipedUserIds = await Swipe.find({ swiper: currentUserId }).distinct("swipee");

    // Swipes received by current user (likes or supers)
    const likedSwipes = await Swipe.find({
      swipee: currentUserId,
      swiper: { $nin: swipedUserIds },
      swipeType: { $in: ["like", "super"] }
    }).populate("swiper", "username avatar profilePics isVerified fullname gender age location bio preferences height weight education drinking smoking lookingFor kids politics isPremium activeSubscription userId");

    const likes = likedSwipes.map(s => {
      const userRes = buildPublicUserResponse(s.swiper);
      if (userRes) {
        userRes.swipeType = s.swipeType;
        userRes.compliment = s.compliment || "";
      }
      return userRes;
    }).filter(Boolean);
    return res.status(200).json({ status: true, likes });
  } catch (error) {
    console.error("Get Lobby Likes Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getLobbyChats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // 1. Get mutual matches
    const myLikes = await Swipe.find({ swiper: currentUserId, swipeType: { $in: ["like", "super"] } }).distinct("swipee");
    const mutualLikes = await Swipe.find({
      swiper: { $in: myLikes },
      swipee: currentUserId,
      swipeType: { $in: ["like", "super"] }
    });
    const mutualUserIds = mutualLikes.map(s => s.swiper.toString());

    // 2. Get all distinct message partners
    const chatUsers = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }]
    }).distinct("sender");
    const chatUsers2 = await Message.find({
      $or: [{ sender: currentUserId }, { receiver: currentUserId }]
    }).distinct("receiver");
    
    const allChatUserIds = Array.from(new Set([...chatUsers, ...chatUsers2]))
      .map(id => id.toString())
      .filter(id => id !== currentUserId.toString());

    const allChannelUserIds = Array.from(new Set([...mutualUserIds, ...allChatUserIds]));

    // 3. Construct channels details
    const channels = [];
    for (const userId of allChannelUserIds) {
      const otherUser = await User.findById(userId).select("username avatar profilePics isVerified fullname gender age location bio preferences height weight education drinking smoking lookingFor kids politics isPremium activeSubscription userId");
      if (!otherUser) continue;

      const latestMessage = await Message.findOne({
        $or: [
          { sender: currentUserId, receiver: userId },
          { sender: userId, receiver: currentUserId }
        ]
      }).sort({ createdAt: -1 });

      // Check if it's an incoming direct chat request (compliment/message sent to current user, not mutual, and current user has not replied yet)
      const isMutual = mutualUserIds.includes(userId);
      const currentSentMessageCount = await Message.countDocuments({ sender: currentUserId, receiver: userId });
      const isIncomingRequest = !isMutual && currentSentMessageCount === 0;

      channels.push({
        user: buildPublicUserResponse(otherUser),
        latestMessage: latestMessage ? {
          id: latestMessage._id,
          content: latestMessage.content,
          sender: latestMessage.sender,
          receiver: latestMessage.receiver,
          isRead: latestMessage.isRead,
          createdAt: latestMessage.createdAt
        } : null,
        isIncomingRequest,
        isMutual
      });
    }

    // Sort channels by latest message time
    channels.sort((a, b) => {
      const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
      const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
      return timeB - timeA;
    });

    return res.status(200).json({ status: true, channels });
  } catch (error) {
    console.error("Get Lobby Chats Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const getChatMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ status: false, message: "Invalid target user ID" });
    }

    // Check if it is locked for incoming requests without Weekly Pass
    const myLike = await Swipe.findOne({ swiper: currentUserId, swipee: otherUserId, swipeType: { $in: ["like", "super"] } });
    const otherLike = await Swipe.findOne({ swiper: otherUserId, swipee: currentUserId, swipeType: { $in: ["like", "super"] } });
    const isMutual = myLike && otherLike;

    const currentSentMessageCount = await Message.countDocuments({ sender: currentUserId, receiver: otherUserId });
    const isIncomingRequest = !isMutual && currentSentMessageCount === 0;

    const hasWeeklyPass = req.user.activeSubscription &&
                          req.user.activeSubscription.planId === "otaku-pass" &&
                          new Date(req.user.activeSubscription.expiresAt) > new Date();

    if (isIncomingRequest && !hasWeeklyPass) {
      return res.status(403).json({
        status: false,
        needsWeeklyPass: true,
        message: "Incoming chat request locked. Upgrade to Otaku Pass to view and reply!"
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId }
      ]
    }).sort({ createdAt: 1 });

    // Mark incoming messages as read
    await Message.updateMany(
      { sender: otherUserId, receiver: currentUserId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({ status: true, messages });
  } catch (error) {
    console.error("Get Chat Messages Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const sendChatMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ status: false, message: "Receiver ID and message content are required" });
    }

    const hasSubscription = req.user.activeSubscription &&
                            req.user.activeSubscription.expiresAt &&
                            new Date(req.user.activeSubscription.expiresAt) > new Date();

    // Check if it is locked for incoming requests without Weekly Pass (Otaku Pass)
    const myLike = await Swipe.findOne({ swiper: currentUserId, swipee: receiverId, swipeType: { $in: ["like", "super"] } });
    const otherLike = await Swipe.findOne({ swiper: receiverId, swipee: currentUserId, swipeType: { $in: ["like", "super"] } });
    const isMutual = myLike && otherLike;

    const currentSentMessageCount = await Message.countDocuments({ sender: currentUserId, receiver: receiverId });
    const isIncomingRequest = !isMutual && currentSentMessageCount === 0;

    const hasWeeklyPass = req.user.activeSubscription &&
                          req.user.activeSubscription.planId === "otaku-pass" &&
                          new Date(req.user.activeSubscription.expiresAt) > new Date();

    if (isIncomingRequest && !hasWeeklyPass) {
      return res.status(403).json({
        status: false,
        needsWeeklyPass: true,
        message: "Incoming chat request locked. Upgrade to Otaku Pass to view and reply!"
      });
    }



    const newMessage = new Message({
      sender: currentUserId,
      receiver: receiverId,
      content: content.trim(),
      isRead: false
    });
    await newMessage.save();

    // Import and send message via Socket.io
    const { sendRealtimeMessage } = await import("../socket/socket.js");
    sendRealtimeMessage(receiverId, newMessage);

    return res.status(201).json({
      status: true,
      message: "Message sent successfully",
      newMessage,
      complimentsBalance: req.user.complimentsBalance
    });
  } catch (error) {
    console.error("Send Chat Message Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

export const redeemPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ status: false, message: "Plan ID is required" });
    }

    if (!["mana-drop", "power-surge"].includes(planId)) {
      return res.status(400).json({ status: false, message: "Only Mana Drop and Power Surge are redeemable via Synergy points" });
    }

    const user = req.user;
    const requiredSynergy = planId === "mana-drop" ? 5000 : 10000;

    if ((user.synergy || 0) < requiredSynergy) {
      return res.status(400).json({
        status: false,
        message: `Insufficient Quantum Synergy! You need ${requiredSynergy} points, but currently have ${user.synergy || 0}.`
      });
    }

    const plan = await Plan.findOne({ planId });
    if (!plan) {
      return res.status(404).json({ status: false, message: "Plan not found" });
    }

    // Deduct synergy points
    user.synergy = Math.max(0, (user.synergy || 0) - requiredSynergy);

    // Apply benefits (accounting for girls 2x multiplier!)
    const isGirl = user.gender && ["female", "girl", "woman"].includes(user.gender.toLowerCase().trim());
    const multiplier = isGirl ? 2 : 1;

    // Apply compliments refill
    const complimentsAdded = plan.complimentsRefill * multiplier;
    user.complimentsBalance = (user.complimentsBalance !== undefined ? user.complimentsBalance : 1) + complimentsAdded;

    // Apply extra swipes if any
    let extraSwipesAdded = 0;
    if (plan.planId === "mana-drop") {
      extraSwipesAdded = 15 * multiplier;
      user.extraSwipesBalance = (user.extraSwipesBalance || 0) + extraSwipesAdded;
    }

    // Apply super likes if any
    let superLikesAdded = 0;
    if (plan.planId === "mana-drop") {
      superLikesAdded = 1 * multiplier;
    } else if (plan.planId === "power-surge") {
      superLikesAdded = 3 * multiplier;
    }
    user.superLikesBalance = (user.superLikesBalance !== undefined ? user.superLikesBalance : 1) + superLikesAdded;

    // Apply premium features if plan grants them
    if (plan.isPremium) {
      user.isPremium = true;
    }

    // Record subscription limits if subscription
    if (plan.type === "subscription" && plan.durationDays > 0) {
      const purchasedAt = new Date();
      const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
      user.activeSubscription = {
        plan: plan._id,
        planId: plan.planId,
        purchasedAt,
        expiresAt,
      };
    }

    await user.save();

    // Store payment transaction as synergy redemption
    const paymentLog = new Payment({
      user: user._id,
      planId,
      razorpay_payment_id: `synergy_redeem_${Date.now()}`,
      razorpay_order_id: `synergy_order_${Date.now()}`,
      razorpay_signature: "synergy_redeemed",
      amount: 0,
      status: "verified",
    });
    await paymentLog.save();

    return res.status(200).json({
      status: true,
      message: `Plan successfully redeemed using ${requiredSynergy} Synergy points!`,
      user: buildUserResponse(user),
    });
  } catch (error) {
    console.error("Redeem Plan Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Initiate forgot password process.
 * Route: POST /api/user/forgot-password
 * 
 * Imports Used:
 * - User (from ../Models/user.schema.js)
 * - sendEmail (from ../utils/email.js)
 * - generateOTP (local helper function)
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "User with this email not found" });
    }

    if (user.resetPasswordOtp && user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt > new Date()) {
      return res.status(200).json({
        message: "Reset code already sent. Please check your email.",
        status: true,
        email: user.email,
        resetPasswordOtpExpiresAt: user.resetPasswordOtpExpiresAt.toISOString(),
      });
    }

    const otp = generateOTP();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await user.save();

    // Send OTP verification email
    try {
      await sendEmail({
        to: user.email,
        templateIdentifier: "forgot-password",
        replacements: {
          fullname: user.fullname || user.username || "Otaku User",
          otp: otp
        }
      });
    } catch (mailErr) {
      console.error("Failed to send reset password email:", mailErr);
    }

    return res.status(200).json({
      message: "Reset code sent to your email.",
      status: true,
      email: user.email,
      resetPasswordOtpExpiresAt: user.resetPasswordOtpExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Reset user password with OTP code.
 * Route: POST /api/user/reset-password
 * 
 * Imports Used:
 * - User (from ../Models/user.schema.js)
 * - bcrypt (from bcryptjs)
 * - generateRandomUsername (local helper function)
 * - generateUserId (from ../utils/jwt.js)
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!user.resetPasswordOtp) {
      return res.status(400).json({ message: "No password reset request found" });
    }

    // Check expiry
    if (user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt < new Date()) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpiresAt = undefined;
      await user.save();
      return res.status(400).json({ message: "Reset code has expired. Please request a new one." });
    }

    // Compare OTP
    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    // Check if new password is the same as current password
    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ message: "New password cannot be the same as your current password" });
      }
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear forgot password fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiresAt = undefined;

    // Automatically verify the user since they verified their email ownership via forgot-password code
    user.isVerified = true;

    // Auto-generate username/userId if the user registered via social login but did not complete basic profile/sign up setup yet (e.g. user was unverified/OAuth without password)
    if (!user.username) {
      user.username = await generateRandomUsername();
    }
    if (!user.userId) {
      user.userId = await generateUserId();
    }

    await user.save();

    return res.status(200).json({
      status: true,
      message: "Password reset successful. Please login with your new password.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Retrieve current authenticated user's private profile details.
 * Route: GET /api/user/me
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const { pendingOrderId, pendingPlanId } = req.query;
    let paymentVerified = false;
    let paymentProcessing = false;
    let pendingPlanName = "";
    let updatedUser = user;

    // Check DB for any payment with status 'created' in the last 10 minutes (server-side pending order tracking)
    const createdPayment = await Payment.findOne({
      user: updatedUser._id,
      status: "created",
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    const targetOrderId = pendingOrderId || createdPayment?.razorpay_order_id;
    const targetPlanId = pendingPlanId || createdPayment?.planId;

    if (targetOrderId) {
      const existingPayment = await Payment.findOne({
        razorpay_order_id: targetOrderId,
        status: "verified"
      });

      if (existingPayment) {
        paymentVerified = true;
      } else if (targetPlanId) {
        // Fetch order details from Razorpay to verify on the fly
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        try {
          const payments = await razorpay.orders.fetchPayments(targetOrderId);
          const capturedPayment = payments.items?.find(p => p.status === "captured");
          const failedPayment = payments.items?.find(p => p.status === "failed");
          const plan = await Plan.findOne({ planId: targetPlanId });

          if (capturedPayment && plan) {
            fulfillSubscriptionPlan(user, plan);
            await user.save();
            updatedUser = user;

            if (createdPayment && createdPayment.razorpay_order_id === targetOrderId) {
              createdPayment.razorpay_payment_id = capturedPayment.id;
              createdPayment.status = "verified";
              await createdPayment.save();
            } else {
              const paymentLog = new Payment({
                user: user._id,
                planId: targetPlanId,
                razorpay_payment_id: capturedPayment.id,
                razorpay_order_id: targetOrderId,
                razorpay_signature: "api_verified",
                amount: plan.price * 100,
                status: "verified",
              });
              await paymentLog.save();
            }

            paymentVerified = true;
          } else if (failedPayment && plan) {
            // Mark payment as failed in DB if Razorpay reports payment failed
            if (createdPayment && createdPayment.razorpay_order_id === targetOrderId) {
              createdPayment.razorpay_payment_id = failedPayment.id;
              createdPayment.status = "failed";
              await createdPayment.save();
            }
            paymentProcessing = false;
          } else if (plan && (!payments.items || payments.items.length === 0)) {
            // Only set paymentProcessing if no attempts exist and order is recent (< 5 mins)
            const orderAgeMinutes = (Date.now() - new Date(createdPayment?.createdAt || Date.now()).getTime()) / (1000 * 60);
            if (orderAgeMinutes < 5) {
              paymentProcessing = true;
              pendingPlanName = plan.name;
            } else if (createdPayment) {
              createdPayment.status = "failed";
              await createdPayment.save();
            }
          }
        } catch (err) {
          console.error("Razorpay verification inside getMe failed:", err);
        }
      }
    }

    // Check for any recently verified payment in the last 15 minutes to notify user even if localStorage was cleared
    let recentPaymentInfo = null;
    const recentVerifiedPayment = await Payment.findOne({
      user: updatedUser._id,
      status: "verified",
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    if (recentVerifiedPayment) {
      const plan = await Plan.findOne({ planId: recentVerifiedPayment.planId });
      recentPaymentInfo = {
        paymentId: recentVerifiedPayment.razorpay_payment_id,
        planId: recentVerifiedPayment.planId,
        planName: plan ? plan.name : recentVerifiedPayment.planId,
        verifiedAt: recentVerifiedPayment.createdAt,
      };
    }

    return res.status(200).json({
      status: true,
      user: buildUserResponse(updatedUser),
      paymentVerified,
      paymentProcessing,
      pendingPlanName,
      recentPayment: recentPaymentInfo,
    });
  } catch (error) {
    console.error("Get Me Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Retrieve public profile details for a specific user.
 * Route: GET /api/user/profile/:id
 * 
 * Imports Used:
 * - User (from ../Models/user.schema.js)
 * - buildPublicUserResponse (local helper function)
 */
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ status: false, message: "Invalid user ID format" });
    }

    const user = await User.findById(id);
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

export default {
  checkEmail,
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  oauthLoginOrSignup,
  onboardUser,
  getMetadata,
  updateProfile,
  uploadAvatar,
  uploadPhoto,
  deletePhoto,
  getCountries,
  getStates,
  getCities,
  generateUsername,
  getCandidates,
  swipeUser,
  reportUser,
  createOrder,
  verifyPayment,
  handleRazorpayWebhook,
  fulfillSubscriptionPlan,
  getPlans,
  getLobbyLikes,
  getLobbyChats,
  getChatMessages,
  sendChatMessage,
  redeemPlan,
  forgotPassword,
  resetPassword,
  getUserProfile,
  getMe,
};
