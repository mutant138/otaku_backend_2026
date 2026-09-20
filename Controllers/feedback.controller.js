import axios from "axios";
import dbCommonQuery from "../utils/dbCommonQuery.js";

/**
 * Submit user feedback and forward to Google Apps Script (Google Sheets / Excel) & store in MongoDB
 * Route: POST /api/user/feedback
 */
export const submitFeedback = async (req, res) => {
  try {
    const { username, email, feedback, tag, rating } = req.body || {};

    if (!username || !username.trim()) {
      return res.status(400).json({ status: false, message: "Username is required." });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ status: false, message: "Email is required." });
    }

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ status: false, message: "Feedback message cannot be empty." });
    }

    // Determine normalized tag
    let normalizedTag = "general";
    if (tag && ["feature", "bug", "ux", "content", "general", "other"].includes(tag.toLowerCase())) {
      normalizedTag = tag.toLowerCase();
    } else {
      const lower = feedback.toLowerCase();
      if (lower.includes("[bug") || lower.includes("bug")) normalizedTag = "bug";
      else if (lower.includes("[feature") || lower.includes("feature")) normalizedTag = "feature";
      else if (lower.includes("[ux") || lower.includes("ui") || lower.includes("design")) normalizedTag = "ux";
      else if (lower.includes("[content") || lower.includes("anime") || lower.includes("game")) normalizedTag = "content";
    }

    // Save to MongoDB
    const savedFeedback = await dbCommonQuery({
      model: "Feedback",
      action: "create",
      data: {
        user: req.user?._id || null,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        tag: normalizedTag,
        feedback: feedback.trim(),
        rating: rating && Number(rating) >= 1 && Number(rating) <= 5 ? Number(rating) : undefined,
        status: "pending",
        source: "OtakuDuo Web",
      },
    });

    const payload = {
      id: savedFeedback._id,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      tag: normalizedTag,
      feedback: feedback.trim(),
      submittedAt: new Date().toISOString(),
      source: "OtakuDuo Web",
    };

    // Forward to Google Apps Script in the background if configured
    const appsScriptUrl = process.env.FEEDBACK_APPS_SCRIPT_URL;
    if (appsScriptUrl && appsScriptUrl.trim()) {
      axios
        .post(appsScriptUrl.trim(), payload, {
          headers: { "Content-Type": "application/json" },
          maxRedirects: 5,
        })
        .catch((sheetErr) => {
          console.error("Background error forwarding feedback to Google Sheet:", sheetErr.message);
        });
    }

    return res.status(200).json({
      status: true,
      message: "Feedback submitted successfully!",
      data: savedFeedback,
    });
  } catch (error) {
    console.error("Submit Feedback Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};


