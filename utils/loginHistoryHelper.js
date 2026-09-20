import LoginHistory from "../Models/loginHistory.schema.js";

/**
 * Parse user-agent string into Browser, OS, and Device type.
 */
export function parseUserAgent(ua = "") {
  if (!ua || typeof ua !== "string") {
    return {
      browser: "Unknown",
      os: "Unknown",
      deviceType: "unknown",
    };
  }

  const lowerUa = ua.toLowerCase();

  // Determine Device Type
  let deviceType = "desktop";
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    deviceType = "tablet";
  } else if (
    /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(
      ua
    )
  ) {
    deviceType = "mobile";
  } else if (/bot|crawler|spider|crawling/i.test(ua)) {
    deviceType = "bot";
  }

  // Determine Operating System
  let os = "Unknown";
  if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows nt 6.2/i.test(ua)) os = "Windows 8";
  else if (/windows nt 6.1/i.test(ua)) os = "Windows 7";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) {
    const match = ua.match(/OS (\d+[._]\d+)/i);
    os = match ? `iOS ${match[1].replace("_", ".")}` : "iOS";
  } else if (/android/i.test(ua)) {
    const match = ua.match(/Android (\d+[._]\d+)/i);
    os = match ? `Android ${match[1]}` : "Android";
  } else if (/macintosh|mac os x/i.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/i);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
  } else if (/linux/i.test(ua)) os = "Linux";
  else if (/cros/i.test(ua)) os = "ChromeOS";

  // Determine Browser
  let browser = "Unknown";
  if (/brave/i.test(ua) || lowerUa.includes("brave")) browser = "Brave";
  else if (/edg([ea]|ios)?\/([\d.]+)/i.test(ua)) browser = "Microsoft Edge";
  else if (/opr\/([\d.]+)|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua) && !/edg/i.test(ua) && !/opr/i.test(ua)) {
    browser = "Chrome";
  } else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) {
    browser = "Safari";
  } else if (/discord/i.test(ua)) browser = "Discord In-App";
  else if (/postman/i.test(ua)) browser = "Postman";
  else if (/axios|curl|wget/i.test(ua)) browser = "API Client";

  return { browser, os, deviceType };
}

/**
 * Extract Client IP address from request headers or socket.
 */
export function getIpAddress(req) {
  if (!req) return "Unknown";
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    const ips = forwarded.split(",");
    return ips[0].trim();
  }
  return (
    req.headers?.["x-real-ip"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "Unknown"
  );
}

/**
 * Record a login event into the database asynchronously.
 * Safe to invoke without awaiting; errors will not crash the authentication flow.
 */
export async function recordLoginHistory(req, {
  userId = null,
  email = "",
  username = "",
  loginMethod = "email",
  status = "SUCCESS",
  failReason = "",
  location = {},
} = {}) {
  try {
    const userAgent = req?.headers?.["user-agent"] || "";
    const ipAddress = getIpAddress(req);
    const { browser, os, deviceType } = parseUserAgent(userAgent);

    const doc = new LoginHistory({
      userId: userId || undefined,
      userIdentifier: email || username || "Unknown",
      email: email ? email.toLowerCase().trim() : undefined,
      username: username || undefined,
      ipAddress,
      userAgent,
      browser,
      os,
      deviceType,
      loginMethod,
      status,
      failReason: failReason || undefined,
      location: {
        city: location.city || "",
        region: location.region || "",
        country: location.country || "",
      },
    });

    await doc.save();
    return doc;
  } catch (err) {
    console.error("Failed to record login history:", err.message);
    return null;
  }
}
