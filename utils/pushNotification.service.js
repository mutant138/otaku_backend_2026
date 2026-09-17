import webpush from "web-push";
import User from "../Models/user.schema.js";

// Initialize VAPID details if keys exist
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:support@otakuduo.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  console.log("🔔 [PUSH NOTIFICATION] Web-Push VAPID initialized successfully.");
} else {
  console.warn("⚠️ [PUSH NOTIFICATION] VAPID keys missing. Push notifications disabled.");
}

/**
 * Send Web Push notification to a specific user across all their registered devices
 * Automatically cleans up stale/unsubscribed endpoints (404/410).
 */
export async function sendPushToUser(userId, payload) {
  try {
    // 1. Emit instant Socket.io notification if user is online/active
    try {
      const { sendRealtimeNotification } = await import("../socket/socket.js");
      sendRealtimeNotification(userId, payload);
    } catch (sockErr) {
      console.warn("Socket notification dispatch warning:", sockErr.message);
    }

    if (!vapidPublicKey || !vapidPrivateKey) return;

    const user = await User.findById(userId).select("pushSubscriptions username");
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return;
    }

    const stringifiedPayload = JSON.stringify({
      title: payload.title || "Otaku Duo Alert",
      body: payload.body || "New activity on your profile.",
      icon: payload.icon || "/otakuLogo.jpg",
      badge: payload.badge || "/otakuLogo.jpg",
      url: payload.url || "/lobby",
      tag: payload.tag || "general-alert",
      data: payload.data || {},
    });

    const deadSubscriptions = [];

    const sendPromises = user.pushSubscriptions.map(async (sub) => {
      try {
        const pushSubscriptionObj = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth,
          },
        };
        await webpush.sendNotification(pushSubscriptionObj, stringifiedPayload);
      } catch (err) {
        // If subscription is expired or unsubscribed, mark for removal
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadSubscriptions.push(sub.endpoint);
        } else {
          console.error(`[PUSH NOTIFICATION ERROR] Endpoint: ${sub.endpoint}:`, err.message);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    // Prune dead subscriptions
    if (deadSubscriptions.length > 0) {
      await User.findByIdAndUpdate(userId, {
        $pull: { pushSubscriptions: { endpoint: { $in: deadSubscriptions } } },
      });
    }
  } catch (error) {
    console.error("[PUSH NOTIFICATION GLOBAL ERROR]:", error.message);
  }
}

/**
 * Notify when a new direct message is received
 */
export async function sendNewMessagePush(recipientId, senderUser, messageText) {
  const senderName = senderUser?.username || "Player";
  const avatar = senderUser?.avatar || "/otakuLogo.jpg";
  const preview = messageText && messageText.length > 60 ? `${messageText.slice(0, 57)}...` : messageText;

  await sendPushToUser(recipientId, {
    title: `⚔️ Transmission from ${senderName}`,
    body: preview || "Sent you a new encrypted message.",
    icon: avatar,
    tag: `chat-${senderUser?._id || senderUser?.id}`,
    url: "/lobby",
  });
}

/**
 * Notify when a user scans/views someone's profile on the radar
 */
export async function sendProfileViewPush(viewedUserId, viewerUser, syncScore = 90) {
  const viewerName = viewerUser?.username || "A traveler";
  const avatar = viewerUser?.avatar || "/otakuLogo.jpg";

  await sendPushToUser(viewedUserId, {
    title: `⚡ Signal Detected! (${syncScore}% Sync)`,
    body: `${viewerName} just scanned your character sheet in the Radar.`,
    icon: avatar,
    tag: `view-${viewerUser?._id || viewerUser?.id}`,
    url: "/home",
  });
}

/**
 * Notify when a match / mutual duo is formed
 */
export async function sendNewMatchPush(userId, matchedUser, syncScore = 95) {
  const matchedName = matchedUser?.username || "Player";
  const avatar = matchedUser?.avatar || "/otakuLogo.jpg";

  await sendPushToUser(userId, {
    title: `🎉 Duo Established with ${matchedName}!`,
    body: `Synergy Calibration: ${syncScore}%. Head to the Lobby to start your first quest together.`,
    icon: avatar,
    tag: `match-${matchedUser?._id || matchedUser?.id}`,
    url: "/lobby",
  });
}

/**
 * Notify when a compliment is attached to a swipe
 */
export async function sendComplimentPush(recipientId, senderUser, complimentText) {
  const senderName = senderUser?.username || "Player";
  const avatar = senderUser?.avatar || "/otakuLogo.jpg";
  const preview = complimentText && complimentText.length > 70 ? `${complimentText.slice(0, 67)}...` : complimentText;

  await sendPushToUser(recipientId, {
    title: `✨ Direct Compliment from ${senderName}!`,
    body: `"${preview}"`,
    icon: avatar,
    tag: `compliment-${senderUser?._id || senderUser?.id}`,
    url: "/lobby",
  });
}
