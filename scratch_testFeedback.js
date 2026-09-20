import mongoose from "mongoose";
import dotenv from "dotenv";
import Feedback from "../Models/feedback.schema.js";
import { submitFeedback } from "../Controllers/feedback.controller.js";
import {
  getAllFeedbacks,
  getFeedbackStats,
  updateFeedback,
  deleteFeedback,
} from "../Controllers/admin/feedback.admin.controller.js";

dotenv.config();

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function runTests() {
  console.log("=== Testing Feedbacks & Telemetry System ===");
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/otaku_test";
  await mongoose.connect(mongoUri);
  console.log("✓ Connected to Database");

  // 1. Clean previous test feedbacks
  await Feedback.deleteMany({ email: "tester@otakuduo.com" });

  // 2. Submit Feedback via Controller
  const req1 = {
    body: {
      username: "ShadowOtaku",
      email: "tester@otakuduo.com",
      tag: "bug",
      feedback: "[Bug Report] Radar card swipe animation glitches on mobile Safari.",
    },
  };
  const res1 = mockRes();
  await submitFeedback(req1, res1);

  if (res1.statusCode !== 200 || !res1.body?.status) {
    throw new Error(`Failed to submit feedback: ${JSON.stringify(res1.body)}`);
  }
  const createdFeedbackId = res1.body.data._id;
  console.log("✓ Feedback submission saved to DB with ID:", createdFeedbackId);

  // 3. Submit a Feature Request
  const req2 = {
    body: {
      username: "GamerGirl99",
      email: "tester@otakuduo.com",
      tag: "feature",
      feedback: "[Feature Request] Please add Discord Rich Presence status sync!",
    },
  };
  const res2 = mockRes();
  await submitFeedback(req2, res2);
  console.log("✓ Feature request saved to DB");

  // 4. Test Admin Stats
  const reqStats = {};
  const resStats = mockRes();
  await getFeedbackStats(reqStats, resStats);
  console.log("✓ Admin feedback stats response:", resStats.body.data);
  if (resStats.body.data.bugs < 1 || resStats.body.data.features < 1) {
    throw new Error("Stats counts mismatch!");
  }

  // 5. Test Admin Get All Feedbacks with search & filter
  const reqList = {
    query: {
      page: "1",
      limit: "10",
      tag: "bug",
      search: "Safari",
    },
  };
  const resList = mockRes();
  await getAllFeedbacks(reqList, resList);
  console.log(`✓ Admin fetched ${resList.body.data.feedbacks.length} bug report matching search`);
  if (resList.body.data.feedbacks.length === 0) {
    throw new Error("Search/filter failed to find the created bug report");
  }

  // 6. Test Admin Update Status and Admin Notes
  const reqUpdate = {
    params: { id: createdFeedbackId },
    body: {
      status: "reviewed",
      adminNotes: "Reproduced on iPhone 15 Pro. Assigned to frontend team.",
    },
  };
  const resUpdate = mockRes();
  await updateFeedback(reqUpdate, resUpdate);
  console.log("✓ Feedback updated status & notes:", resUpdate.body.data.status, "-", resUpdate.body.data.adminNotes);

  if (resUpdate.body.data.status !== "reviewed" || !resUpdate.body.data.adminNotes.includes("iPhone 15")) {
    throw new Error("Update feedback failed");
  }

  // 7. Test Admin Delete Feedback
  const reqDelete = {
    params: { id: createdFeedbackId },
  };
  const resDelete = mockRes();
  await deleteFeedback(reqDelete, resDelete);
  console.log("✓ Feedback deleted successfully:", resDelete.body.message);

  // Clean up
  await Feedback.deleteMany({ email: "tester@otakuduo.com" });

  console.log("\n=================================");
  console.log("ALL FEEDBACK TESTS PASSED SUCCESSFULLY!");
  console.log("=================================");

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
