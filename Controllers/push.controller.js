import User from "../Models/user.schema.js";
import { sendPushToUser } from "../utils/pushNotification.service.js";

/**
 * Get VAPID Public Key for client-side push subscription
 * Route: GET /api/user/push/vapid-key
 */
export const getVapidPublicKey = async (req, res) => {
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(500).json({ status: false, message: "Push notification VAPID key is not configured" });
    }
    return res.status(200).json({ status: true, publicKey });
  } catch (error) {
    console.error("Get VAPID Key Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Subscribe a device/browser to Web Push notifications
 * Route: POST /api/user/push/subscribe
 */
export const subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
      return res.status(400).json({ status: false, message: "Invalid push subscription object" });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const userAgent = req.headers["user-agent"] || "Unknown device";

    // Check if subscription endpoint already exists
    const exists = user.pushSubscriptions.some((s) => s.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        userAgent,
        createdAt: new Date(),
      });
      await user.save();
    }

    return res.status(200).json({ status: true, message: "Push notification subscription registered successfully" });
  } catch (error) {
    console.error("Subscribe Push Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Unsubscribe a device from Web Push notifications
 * Route: POST /api/user/push/unsubscribe
 */
export const unsubscribePush = async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ status: false, message: "Subscription endpoint required" });
    }

    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint } },
    });

    return res.status(200).json({ status: true, message: "Unsubscribed from push notifications successfully" });
  } catch (error) {
    console.error("Unsubscribe Push Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Send a quick test push notification to verify device setup
 * Route: POST /api/user/push/test
 */
export const sendTestPush = async (req, res) => {
  try {
    const userId = req.user._id;
    await sendPushToUser(userId, {
      title: "⚔️ Otaku Duo Signal Verified!",
      body: "Push notifications calibrated successfully! You will now receive alerts for new messages, radar matches, and compliments.",
      icon: "/otakuLogo.jpg",
      tag: "test-notification",
      url: "/lobby",
    });

    return res.status(200).json({ status: true, message: "Test push notification dispatched!" });
  } catch (error) {
    console.error("Send Test Push Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
