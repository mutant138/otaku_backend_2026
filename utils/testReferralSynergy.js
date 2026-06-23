import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../Models/user.schema.js";
import Plan from "../Models/plan.schema.js";
import Payment from "../Models/payment.schema.js";
import EmailTemplate from "../Models/emailTemplate.schema.js";
import { registerUser, verifyOtp, oauthLoginOrSignup, redeemPlan } from "../Controllers/user.controller.js";

dotenv.config();

// Clear SMTP credentials to enforce mock email printing and bypass nodemailer real delivery
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";

const dbName = "otaku_test";

const DEFAULT_PLANS = [
  {
    planId: "mana-drop",
    name: "Mana Drop",
    price: 49,
    originalPrice: 99,
    description: "Mana refill for compliment and extra swipe capacity.",
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
  }
];

function makeRes() {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      resolvePromise(this);
      return this;
    },
    promise
  };
  return res;
}

const next = (err) => {
  if (err) throw err;
};

async function runTests() {
  console.log("Connecting to test database...");
  await mongoose.connect(process.env.MONGO_URI, { dbName });
  console.log("Connected. Clearing collections...");

  await User.deleteMany({});
  await Plan.deleteMany({});
  await Payment.deleteMany({});
  await EmailTemplate.deleteMany({});

  console.log("Seeding test data...");
  await Plan.insertMany(DEFAULT_PLANS);
  await EmailTemplate.create({
    identifier: "otp-verification",
    subject: "Verify your OtakuDuo account",
    content: "OTP: {{otp}}"
  });

  let referrerUser;
  let referredUser;

  // -------------------------------------------------------------
  // Test Case 1: Standard Signup Flow with Referral
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 1: Standard Signup Flow with Referral ---");
  {
    // Create Referrer manually to get a valid userId
    referrerUser = new User({
      username: "ReferrerGamer",
      email: "referrer@example.com",
      userId: "USR123456",
      isVerified: true,
      synergy: 0
    });
    await referrerUser.save();
    console.log("Referrer created with userId:", referrerUser.userId);

    // Register referred user B
    const req = {
      body: {
        fullname: "Referred Player",
        email: "referred@example.com",
        password: "password123",
        referredBy: referrerUser.userId
      }
    };
    const res = makeRes();
    await registerUser(req, res);
    const result = await res.promise;

    if (result.statusCode !== 201) {
      throw new Error(`Register failed with code ${result.statusCode}: ${JSON.stringify(result.body)}`);
    }
    console.log("Referred user registration initiated. OTP sent.");

    // Fetch user B directly to inspect DB state
    referredUser = await User.findOne({ email: "referred@example.com" });
    if (!referredUser) throw new Error("Referred user not found in DB!");
    if (referredUser.referredBy !== referrerUser.userId) throw new Error("referredBy field not populated!");
    if (referredUser.isVerified) throw new Error("User should not be verified yet!");

    // Verify OTP
    console.log("Verifying OTP for referred user...");
    const verifyReq = {
      body: {
        email: referredUser.email,
        otp: referredUser.otp
      }
    };
    const verifyRes = makeRes();
    await verifyOtp(verifyReq, verifyRes);
    const verifyResult = await verifyRes.promise;

    if (verifyResult.statusCode !== 200) {
      throw new Error(`OTP Verification failed: ${JSON.stringify(verifyResult.body)}`);
    }

    // Refresh models from DB
    referredUser = await User.findOne({ email: "referred@example.com" });
    referrerUser = await User.findOne({ userId: referrerUser.userId });

    if (!referredUser.isVerified) throw new Error("Referred user isVerified should be true!");
    if (referrerUser.synergy !== 5) throw new Error(`Referrer synergy expected to be 5, got ${referrerUser.synergy}`);
    console.log("✓ Test Case 1 Passed! Referred user verified and Referrer synergy awarded 5 points.");

    // Verify subsequent OTP attempts don't award more points
    // Keep referredUser.isVerified as true, and verify another OTP to check that no new synergy is awarded
    referredUser.otp = "123456";
    referredUser.otpExpiresAt = new Date(Date.now() + 50000);
    await referredUser.save();

    const verifyReq2 = { body: { email: referredUser.email, otp: "123456" } };
    const verifyRes2 = makeRes();
    await verifyOtp(verifyReq2, verifyRes2);
    await verifyRes2.promise;

    referrerUser = await User.findOne({ userId: referrerUser.userId });
    if (referrerUser.synergy !== 5) throw new Error(`Referrer synergy increased on re-verification! Got ${referrerUser.synergy}`);
    console.log("✓ Test Case 1 Sub-test Passed: Duplicate OTP verification did not award extra synergy.");
  }

  // -------------------------------------------------------------
  // Test Case 2: Standard Signup Flow with Invalid Referrer
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 2: Standard Signup Flow with Invalid Referrer ---");
  {
    const req = {
      body: {
        fullname: "No Referral Player",
        email: "noreferral@example.com",
        password: "password123",
        referredBy: "INVALID_USER_ID"
      }
    };
    const res = makeRes();
    await registerUser(req, res);
    const result = await res.promise;

    if (result.statusCode !== 201) {
      throw new Error(`Register with invalid referrer failed!`);
    }

    const norefUser = await User.findOne({ email: "noreferral@example.com" });
    const verifyReq = {
      body: {
        email: norefUser.email,
        otp: norefUser.otp
      }
    };
    const verifyRes = makeRes();
    await verifyOtp(verifyReq, verifyRes);
    const verifyResult = await verifyRes.promise;

    if (verifyResult.statusCode !== 200) {
      throw new Error("OTP verification failed for invalid referrer case");
    }

    console.log("✓ Test Case 2 Passed! Invalid referrer registration completed gracefully.");
  }

  // -------------------------------------------------------------
  // Test Case 3: OAuth Signup Flow with Referral (Discord)
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 3: Discord OAuth Signup with Referral ---");
  {
    const req = {
      body: {
        provider: "discord",
        email: "discord_oauth@example.com",
        username: "DiscordGamer",
        providerId: "99887766",
        avatar: "https://example.com/avatar.png",
        referredBy: referrerUser.userId
      }
    };
    const res = makeRes();
    await oauthLoginOrSignup(req, res, next);
    const result = await res.promise;

    if (result.statusCode !== 200) {
      throw new Error(`Discord OAuth registration failed: ${JSON.stringify(result.body)}`);
    }

    const oauthUser = await User.findOne({ email: "discord_oauth@example.com" });
    if (!oauthUser) throw new Error("OAuth user not created!");
    if (!oauthUser.isVerified) throw new Error("OAuth user must be automatically verified!");
    if (oauthUser.referredBy !== referrerUser.userId) throw new Error("Referred by not set!");

    referrerUser = await User.findOne({ userId: referrerUser.userId });
    if (referrerUser.synergy !== 10) throw new Error(`Referrer synergy expected to be 10, got ${referrerUser.synergy}`);
    console.log("✓ Test Case 3 Passed! OAuth user auto-verified, referrer synergy increased to 10.");
  }

  // -------------------------------------------------------------
  // Test Case 4: Synergy Redemption - Insufficient Points
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 4: Synergy Redemption - Insufficient Points ---");
  {
    // User B has 0 synergy points
    const req = {
      body: { planId: "mana-drop" },
      user: referredUser
    };
    const res = makeRes();
    await redeemPlan(req, res);
    const result = await res.promise;

    if (result.statusCode !== 400 || !result.body.message.includes("Insufficient")) {
      throw new Error(`Expected fail due to insufficient points, got status ${result.statusCode}: ${JSON.stringify(result.body)}`);
    }
    console.log("✓ Test Case 4 Passed! Insufficient points redemption rejected with 400.");
  }

  // -------------------------------------------------------------
  // Test Case 5: Synergy Redemption - Successful (Male)
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 5: Synergy Redemption - Successful (Male User, 1x multiplier) ---");
  {
    // Set user synergy to 10000 and gender to male
    referredUser.synergy = 10000;
    referredUser.gender = "male";
    referredUser.complimentsBalance = 1;
    referredUser.extraSwipesBalance = 0;
    referredUser.superLikesBalance = 1;
    await referredUser.save();

    const req = {
      body: { planId: "mana-drop" },
      user: referredUser
    };
    const res = makeRes();
    await redeemPlan(req, res);
    const result = await res.promise;

    if (result.statusCode !== 200) {
      throw new Error(`Synergy redemption failed: ${JSON.stringify(result.body)}`);
    }

    const updatedUser = await User.findById(referredUser._id);
    if (updatedUser.synergy !== 5000) throw new Error(`Synergy expected to be 5000, got ${updatedUser.synergy}`);
    // mana-drop awards complimentsRefill (2) * 1 = 2 compls. Total = 1 + 2 = 3.
    if (updatedUser.complimentsBalance !== 3) throw new Error(`Expected complimentsBalance to be 3, got ${updatedUser.complimentsBalance}`);
    // mana-drop awards 15 extra swipes * 1 = 15 extra swipes. Total = 15.
    if (updatedUser.extraSwipesBalance !== 15) throw new Error(`Expected extraSwipesBalance to be 15, got ${updatedUser.extraSwipesBalance}`);
    // mana-drop awards 1 super like * 1 = 1 super like. Total = 1 + 1 = 2.
    if (updatedUser.superLikesBalance !== 2) throw new Error(`Expected superLikesBalance to be 2, got ${updatedUser.superLikesBalance}`);

    // Verify Payment log
    const payment = await Payment.findOne({ user: referredUser._id, planId: "mana-drop" });
    if (!payment) throw new Error("Payment record not found for synergy redemption!");
    if (payment.amount !== 0) throw new Error("Redemption payment amount must be 0!");

    console.log("✓ Test Case 5 Passed! Redeemed mana-drop, deducted 5000 synergy points, applied 1x rewards, and logged payment.");
  }

  // -------------------------------------------------------------
  // Test Case 6: Synergy Redemption - Successful & 2x Multiplier (Female)
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 6: Synergy Redemption - Female User (2x Multiplier) ---");
  {
    // Prepare female user with 10000 points
    referredUser.synergy = 10000;
    referredUser.gender = "female";
    referredUser.complimentsBalance = 1;
    referredUser.superLikesBalance = 1;
    await referredUser.save();

    const req = {
      body: { planId: "power-surge" },
      user: referredUser
    };
    const res = makeRes();
    await redeemPlan(req, res);
    const result = await res.promise;

    if (result.statusCode !== 200) {
      throw new Error(`Synergy redemption for power-surge failed: ${JSON.stringify(result.body)}`);
    }

    const updatedUser = await User.findById(referredUser._id);
    if (updatedUser.synergy !== 0) throw new Error(`Synergy expected to be 0, got ${updatedUser.synergy}`);
    // power-surge default complimentsRefill = 4. With female multiplier 2x -> 8. Total = 1 + 8 = 9.
    if (updatedUser.complimentsBalance !== 9) throw new Error(`Expected complimentsBalance to be 9, got ${updatedUser.complimentsBalance}`);
    // power-surge default superLikesAdded = 3. With female multiplier 2x -> 6. Total = 1 + 6 = 7.
    if (updatedUser.superLikesBalance !== 7) throw new Error(`Expected superLikesBalance to be 7, got ${updatedUser.superLikesBalance}`);
    
    // Check subscription active
    if (!updatedUser.activeSubscription || updatedUser.activeSubscription.planId !== "power-surge") {
      throw new Error("Active subscription details not populated!");
    }

    console.log("✓ Test Case 6 Passed! Redeemed power-surge, deducted 10000 synergy points, applied 2x rewards for female user, and set active subscription.");
  }

  console.log("\n=================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  console.log("=================================");
}

runTests()
  .then(() => {
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n❌ TEST FAILED:", err);
    mongoose.connection.close();
    process.exit(1);
  });
