import axios from "axios";

/**
 * Submit user feedback and forward to Google Apps Script (Google Sheets / Excel)
 * Route: POST /api/user/feedback
 */
export const submitFeedback = async (req, res) => {
  try {
    const { username, email, feedback } = req.body || {};

    if (!username || !username.trim()) {
      return res.status(400).json({ status: false, message: "Username is required." });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ status: false, message: "Email is required." });
    }

    if (!feedback || !feedback.trim()) {
      return res.status(400).json({ status: false, message: "Feedback message cannot be empty." });
    }

    const payload = {
      username: username.trim(),
      email: email.trim(),
      feedback: feedback.trim(),
      submittedAt: new Date().toISOString(),
      source: "OtakuDuo Web",
    };

    const appsScriptUrl = process.env.FEEDBACK_APPS_SCRIPT_URL;

    if (appsScriptUrl && appsScriptUrl.trim()) {
      try {
        const response = await axios.post(appsScriptUrl.trim(), payload, {
          headers: {
            "Content-Type": "application/json",
          },
          maxRedirects: 5,
        });

        return res.status(200).json({
          status: true,
          message: "Feedback submitted successfully!",
          data: response.data,
        });
      } catch (sheetErr) {
        console.error("Error forwarding feedback to Google Sheet:", sheetErr.message);
        return res.status(502).json({
          status: false,
          message: "Failed to forward feedback to Google Sheet. Please try again later.",
        });
      }
    }

    // Fallback: If Google Apps Script URL is not set yet in environment
    console.log("[FEEDBACK LOGGED (Sheet URL not set in backend .env)]:", payload);

    return res.status(200).json({
      status: true,
      message: "Feedback received successfully!",
      pendingSheetUrl: true,
    });
  } catch (error) {
    console.error("Submit Feedback Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

