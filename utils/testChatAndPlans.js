import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../Models/user.schema.js";
import Swipe from "../Models/swipe.schema.js";
import Message from "../Models/message.schema.js";
import Plan from "../Models/plan.schema.js";
import Payment from "../Models/payment.schema.js";
import { swipeUser, getLobbyChats, getChatMessages, sendChatMessage } from "../Controllers/user.controller.js";

dotenv.config();

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

async function createTestUser(email, extra = {}) {
  const user = new User({
    username: email.split("@")[0] + "_" + Math.floor(Math.random() * 1000),
    email,
    userId: "USR_" + Math.floor(Math.random() * 10000000),
    isVerified: true,
    complimentsBalance: 1,
    extraSwipesBalance: 0,
    superLikesBalance: 1,
    ...extra
  });
  return await user.save();
}

async function runTests() {
  console.log("Connecting to test database...");
  await mongoose.connect(process.env.MONGO_URI, { dbName });
  console.log("Connected. Clearing collections...");

  await User.deleteMany({});
  await Swipe.deleteMany({});
  await Message.deleteMany({});
  await Plan.deleteMany({});
  await Payment.deleteMany({});

  console.log("Seeding test plans...");
  const seededPlans = await Plan.insertMany(DEFAULT_PLANS);
  const otakuPassPlan = seededPlans.find(p => p.planId === "otaku-pass");
  const powerSurgePlan = seededPlans.find(p => p.planId === "power-surge");

  // -------------------------------------------------------------
  // Test Case 1: Daily Swipe Limits and Refills (Free User)
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 1: Daily Swipe Limits & Refills (Free User) ---");
  {
    const swiper = await createTestUser("free_swiper@example.com");
    // Create 6 different swipee users
    const targets = [];
    for (let i = 0; i < 7; i++) {
      targets.push(await createTestUser(`target${i}@example.com`));
    }

    // Swiper performs 5 swipes
    for (let i = 0; i < 5; i++) {
      const req = {
        user: swiper,
        body: { swipeeId: targets[i]._id.toString(), swipeType: "like" }
      };
      const res = makeRes();
      await swipeUser(req, res);
      const result = await res.promise;
      if (result.statusCode !== 201) {
        throw new Error(`Swipe ${i + 1} failed with status ${result.statusCode}: ${JSON.stringify(result.body)}`);
      }
    }
    console.log("5 swipes completed successfully.");

    // 6th swipe should be rejected
    const req6 = {
      user: swiper,
      body: { swipeeId: targets[5]._id.toString(), swipeType: "like" }
    };
    const res6 = makeRes();
    await swipeUser(req6, res6);
    const result6 = await res6.promise;

    if (result6.statusCode !== 403 || !result6.body.limitReached) {
      throw new Error(`6th swipe expected 403 limitReached, got ${result6.statusCode}: ${JSON.stringify(result6.body)}`);
    }
    console.log("✓ 6th swipe rejected with 403 limitReached successfully.");

    // Award 2 extra swipes
    console.log("Awarding 2 extra swipes...");
    swiper.extraSwipesBalance = 2;
    await swiper.save();

    // 6th swipe should now succeed!
    const res6_retry = makeRes();
    await swipeUser(req6, res6_retry);
    const result6_retry = await res6_retry.promise;
    if (result6_retry.statusCode !== 201) {
      throw new Error(`Retry of 6th swipe failed: ${JSON.stringify(result6_retry.body)}`);
    }

    // 7th swipe should also succeed
    const req7 = {
      user: swiper,
      body: { swipeeId: targets[6]._id.toString(), swipeType: "like" }
    };
    const res7 = makeRes();
    await swipeUser(req7, res7);
    const result7 = await res7.promise;
    if (result7.statusCode !== 201) {
      throw new Error(`7th swipe failed: ${JSON.stringify(result7.body)}`);
    }

    // 8th swipe should be rejected because extra swipes are depleted
    const target8 = await createTestUser("target8@example.com");
    const req8 = {
      user: swiper,
      body: { swipeeId: target8._id.toString(), swipeType: "like" }
    };
    const res8 = makeRes();
    await swipeUser(req8, res8);
    const result8 = await res8.promise;

    if (result8.statusCode !== 403 || !result8.body.limitReached) {
      throw new Error(`8th swipe expected 403 limitReached, got ${result8.statusCode}`);
    }

    // Verify extraSwipesBalance is now 0
    const updatedSwiper = await User.findById(swiper._id);
    if (updatedSwiper.extraSwipesBalance !== 0) {
      throw new Error(`extraSwipesBalance expected to be 0, got ${updatedSwiper.extraSwipesBalance}`);
    }
    console.log("✓ Test Case 1 Passed! Daily limits enforced, extra swipes consumed correctly, and balance decremented.");
  }

  // -------------------------------------------------------------
  // Test Case 2: Daily Swipe Limits (Subscribed User)
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 2: Daily Swipe Limits (Subscribed User) ---");
  {
    const subSwiper = await createTestUser("subscribed_swiper@example.com", {
      activeSubscription: {
        plan: otakuPassPlan._id,
        planId: otakuPassPlan.planId,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days expiry
      }
    });

    // Subscribed user performs 10 swipes
    for (let i = 0; i < 10; i++) {
      const target = await createTestUser(`sub_target${i}@example.com`);
      const req = {
        user: subSwiper,
        body: { swipeeId: target._id.toString(), swipeType: "like" }
      };
      const res = makeRes();
      await swipeUser(req, res);
      const result = await res.promise;
      if (result.statusCode !== 201) {
        throw new Error(`Subscribed user swipe ${i + 1} failed: ${result.statusCode}`);
      }
    }
    console.log("✓ Test Case 2 Passed! Subscribed user bypassed daily limits successfully.");
  }

  // -------------------------------------------------------------
  // Test Case 3: Compliments Limits (Free vs. Premium)
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 3: Compliments Limits (Free vs. Premium) ---");
  {
    const freeUser = await createTestUser("free_complimenter@example.com", { complimentsBalance: 0 });
    const premiumUser = await createTestUser("premium_complimenter@example.com", { isPremium: true, complimentsBalance: 0 });
    const target = await createTestUser("compliment_target@example.com");

    // 1. Free user with 0 compliments tries to swipe with a compliment
    const req1 = {
      user: freeUser,
      body: { swipeeId: target._id.toString(), swipeType: "like", compliment: "Nice avatar!" }
    };
    const res1 = makeRes();
    await swipeUser(req1, res1);
    const result1 = await res1.promise;

    if (result1.statusCode !== 403 || !result1.body.needsSubscription) {
      throw new Error(`Expected free user with 0 compliments to get 403 needsSubscription, got ${result1.statusCode}`);
    }
    console.log("✓ Free user with 0 balance rejected successfully.");

    // 2. Free user with 1 compliment tries to swipe with compliment
    freeUser.complimentsBalance = 1;
    await freeUser.save();

    const res1_retry = makeRes();
    await swipeUser(req1, res1_retry);
    const result1_retry = await res1_retry.promise;

    if (result1_retry.statusCode !== 201) {
      throw new Error(`Expected compliment swipe to succeed, got status ${result1_retry.statusCode}`);
    }

    const updatedFreeUser = await User.findById(freeUser._id);
    if (updatedFreeUser.complimentsBalance !== 0) {
      throw new Error(`Expected free user complimentsBalance to decrement to 0, got ${updatedFreeUser.complimentsBalance}`);
    }

    const messageLogged = await Message.findOne({ sender: freeUser._id, receiver: target._id });
    if (!messageLogged || messageLogged.content !== "Nice avatar!") {
      throw new Error("Compliment was not saved to Message collection!");
    }
    console.log("✓ Free user compliment consumed balance and saved message successfully.");

    // 3. Premium user with 0 compliments tries to swipe with compliment
    const reqPremium = {
      user: premiumUser,
      body: { swipeeId: target._id.toString(), swipeType: "like", compliment: "Awesome profile!" }
    };
    const resPremium = makeRes();
    // Clear any existing swipe first
    await Swipe.deleteMany({ swiper: premiumUser._id });
    await swipeUser(reqPremium, resPremium);
    const resultPremium = await resPremium.promise;

    if (resultPremium.statusCode !== 201) {
      throw new Error(`Expected premium user compliment to succeed, got status ${resultPremium.statusCode}`);
    }

    const updatedPremiumUser = await User.findById(premiumUser._id);
    if (updatedPremiumUser.complimentsBalance !== 0) {
      throw new Error(`Premium user compliments balance should remain 0`);
    }
    console.log("✓ Test Case 3 Passed! Compliment bounds verified for Free and Premium users.");
  }

  // -------------------------------------------------------------
  // Test Case 4: Super Likes Limits (Free vs. Subscribed)
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 4: Super Likes Limits (Free vs. Subscribed) ---");
  {
    const freeUser = await createTestUser("free_super@example.com", { superLikesBalance: 0 });
    const subUser = await createTestUser("sub_super@example.com", {
      superLikesBalance: 0,
      activeSubscription: {
        plan: powerSurgePlan._id,
        planId: powerSurgePlan.planId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
    const target = await createTestUser("super_target@example.com");
    const target2 = await createTestUser("super_target2@example.com");

    // 1. Free user with 0 super likes
    const req1 = {
      user: freeUser,
      body: { swipeeId: target._id.toString(), swipeType: "super" }
    };
    const res1 = makeRes();
    await swipeUser(req1, res1);
    const result1 = await res1.promise;

    if (result1.statusCode !== 403 || !result1.body.needsRefill) {
      throw new Error(`Expected 403 needsRefill for super like with 0 balance, got ${result1.statusCode}`);
    }
    console.log("✓ Free user with 0 super likes blocked successfully.");

    // 2. Free user with 1 super like
    freeUser.superLikesBalance = 1;
    await freeUser.save();

    const res1_retry = makeRes();
    await swipeUser(req1, res1_retry);
    const result1_retry = await res1_retry.promise;

    if (result1_retry.statusCode !== 201) {
      throw new Error(`Expected super swipe to succeed, got status ${result1_retry.statusCode}`);
    }
    const updatedFreeUser = await User.findById(freeUser._id);
    if (updatedFreeUser.superLikesBalance !== 0) {
      throw new Error(`superLikesBalance expected to decrement to 0, got ${updatedFreeUser.superLikesBalance}`);
    }
    console.log("✓ Free user super like decremented balance successfully.");

    // 3. Subscribed user with 0 super likes
    const reqSub = {
      user: subUser,
      body: { swipeeId: target2._id.toString(), swipeType: "super" }
    };
    const resSub = makeRes();
    await swipeUser(reqSub, resSub);
    const resultSub = await resSub.promise;

    if (resultSub.statusCode !== 201) {
      throw new Error(`Expected subscribed user to swipe super without balance, got status ${resultSub.statusCode}`);
    }
    const updatedSubUser = await User.findById(subUser._id);
    if (updatedSubUser.superLikesBalance !== 0) {
      throw new Error(`Subscribed user superLikesBalance should remain 0`);
    }
    console.log("✓ Test Case 4 Passed! Super Like limits enforced and bypassed based on subscription status.");
  }

  // -------------------------------------------------------------
  // Test Case 5: Get Lobby Chats & Mutual Matchmaking
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 5: Get Lobby Chats & Mutual Matchmaking ---");
  {
    const userA = await createTestUser("usera@example.com");
    const userB = await createTestUser("userb@example.com");

    // User A likes User B
    await Swipe.create({ swiper: userA._id, swipee: userB._id, swipeType: "like" });

    // Fetch User A's lobby chats (should be empty since it is not mutual and no messages)
    const reqA_lobby1 = { user: userA };
    const resA_lobby1 = makeRes();
    await getLobbyChats(reqA_lobby1, resA_lobby1);
    const resultA_lobby1 = await resA_lobby1.promise;
    if (resultA_lobby1.body.channels.length !== 0) {
      throw new Error(`Expected lobby chats to be empty, got ${resultA_lobby1.body.channels.length}`);
    }

    // User B likes User A (Mutual match created!)
    await Swipe.create({ swiper: userB._id, swipee: userA._id, swipeType: "like" });

    // Fetch User A's lobby chats again
    const resA_lobby2 = makeRes();
    await getLobbyChats(reqA_lobby1, resA_lobby2);
    const resultA_lobby2 = await resA_lobby2.promise;

    if (resultA_lobby2.body.channels.length !== 1) {
      throw new Error(`Expected 1 mutual match channel, got ${resultA_lobby2.body.channels.length}`);
    }
    const channel = resultA_lobby2.body.channels[0];
    if (!channel.isMutual || channel.isIncomingRequest) {
      throw new Error(`Expected channel to be mutual and not incoming request. Mutual: ${channel.isMutual}, Incoming: ${channel.isIncomingRequest}`);
    }
    if (channel.user.id.toString() !== userB._id.toString()) {
      throw new Error("Match channel user ID mismatch!");
    }
    console.log("✓ Test Case 5 Passed! Mutual like successfully registered a lobby chat channel.");
  }

  // -------------------------------------------------------------
  // Test Case 6: Incoming Chat Request Lock & Otaku Pass
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 6: Incoming Chat Request Lock & Otaku Pass ---");
  {
    const userA = await createTestUser("sender_compliment@example.com");
    const userB = await createTestUser("receiver_compliment@example.com", { complimentsBalance: 1 });

    // User A swipes User B with a compliment (No reciprocal swipe from User B, not mutual)
    await Swipe.create({ swiper: userA._id, swipee: userB._id, swipeType: "like" });
    await Message.create({ sender: userA._id, receiver: userB._id, content: "Hey B! Great game library!" });

    // User B (Free) attempts to fetch messages with User A
    const reqB = {
      user: userB,
      params: { otherUserId: userA._id.toString() }
    };
    const resB = makeRes();
    await getChatMessages(reqB, resB);
    const resultB = await resB.promise;

    if (resultB.statusCode !== 403 || !resultB.body.needsWeeklyPass) {
      throw new Error(`Expected 403 needsWeeklyPass for free user viewing incoming request, got status ${resultB.statusCode}`);
    }
    console.log("✓ Free user incoming request view blocked successfully.");

    // Upgrade User B to power-surge (Not otaku-pass)
    userB.activeSubscription = {
      plan: powerSurgePlan._id,
      planId: powerSurgePlan.planId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    await userB.save();

    const resB_power = makeRes();
    await getChatMessages(reqB, resB_power);
    const resultB_power = await resB_power.promise;
    if (resultB_power.statusCode !== 403 || !resultB_power.body.needsWeeklyPass) {
      throw new Error(`Expected 403 needsWeeklyPass even with Power Surge, got status ${resultB_power.statusCode}`);
    }
    console.log("✓ User B with Power Surge still blocked from incoming requests successfully.");

    // Upgrade User B to otaku-pass
    userB.activeSubscription = {
      plan: otakuPassPlan._id,
      planId: otakuPassPlan.planId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };
    await userB.save();

    const resB_otaku = makeRes();
    await getChatMessages(reqB, resB_otaku);
    const resultB_otaku = await resB_otaku.promise;

    if (resultB_otaku.statusCode !== 200) {
      throw new Error(`Expected 200 OK after Otaku Pass upgrade, got status ${resultB_otaku.statusCode}: ${JSON.stringify(resultB_otaku.body)}`);
    }
    if (resultB_otaku.body.messages.length !== 1 || resultB_otaku.body.messages[0].content !== "Hey B! Great game library!") {
      throw new Error("Chat messages retrieve content mismatch!");
    }
    console.log("✓ User B with Otaku Pass successfully unlocked and loaded the message.");

    // Check if the message is marked as read
    const updatedMsg = await Message.findById(resultB_otaku.body.messages[0]._id);
    if (!updatedMsg.isRead) {
      throw new Error("Incoming messages were not marked as read upon retrieval!");
    }
    console.log("✓ Messages marked as read successfully.");
    console.log("✓ Test Case 6 Passed! Chat lock rules for Otaku Pass fully verified.");
  }

  // -------------------------------------------------------------
  // Test Case 7: Send Chat Message Balance Deductions
  // -------------------------------------------------------------
  console.log("\n--- Running Test Case 7: Send Chat Message Balance Deductions ---");
  {
    const userA = await createTestUser("sender_chat@example.com", { complimentsBalance: 0 });
    const userB = await createTestUser("receiver_chat@example.com");

    // Make User A and User B mutual matches so they can chat
    await Swipe.create({ swiper: userA._id, swipee: userB._id, swipeType: "like" });
    await Swipe.create({ swiper: userB._id, swipee: userA._id, swipeType: "like" });

    // 1. User A (0 balance, no sub) sends message
    const req1 = {
      user: userA,
      body: { receiverId: userB._id.toString(), content: "Hello mutual match!" }
    };
    const res1 = makeRes();
    await sendChatMessage(req1, res1);
    const result1 = await res1.promise;

    if (result1.statusCode !== 403 || !result1.body.needsRefill) {
      throw new Error(`Expected 403 needsRefill for 0 balance, got status ${result1.statusCode}`);
    }
    console.log("✓ Free user with 0 compliments balance blocked from sending chat message.");

    // 2. User A with 1 compliment balance sends message
    userA.complimentsBalance = 1;
    await userA.save();

    const res1_retry = makeRes();
    await sendChatMessage(req1, res1_retry);
    const result1_retry = await res1_retry.promise;

    if (result1_retry.statusCode !== 201) {
      throw new Error(`Expected message send to succeed, got status ${result1_retry.statusCode}`);
    }

    const updatedUserA = await User.findById(userA._id);
    if (updatedUserA.complimentsBalance !== 0) {
      throw new Error(`complimentsBalance should decrement to 0, got ${updatedUserA.complimentsBalance}`);
    }
    console.log("✓ Message sent and compliments balance decremented successfully.");

    // 3. User A with active subscription sends message
    userA.activeSubscription = {
      plan: powerSurgePlan._id,
      planId: powerSurgePlan.planId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    await userA.save();

    const resSub = makeRes();
    await sendChatMessage(req1, resSub);
    const resultSub = await resSub.promise;

    if (resultSub.statusCode !== 201) {
      throw new Error(`Expected message send to succeed for subscriber, got status ${resultSub.statusCode}`);
    }
    const finalUserA = await User.findById(userA._id);
    if (finalUserA.complimentsBalance !== 0) {
      throw new Error(`Subscriber complimentsBalance should remain 0`);
    }
    console.log("✓ Subscriber sent chat message without decrementing compliments balance.");
    console.log("✓ Test Case 7 Passed! Chat message balance logic correctly verified.");
  }

  console.log("\n=================================");
  console.log("ALL CHAT/PLAN TESTS PASSED SUCCESSFULLY!");
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
