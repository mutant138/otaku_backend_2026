import bcrypt from "bcryptjs";
import passport from "passport";
import axios from "axios";
import Razorpay from "razorpay";
import dbCommonQuery from "../utils/dbCommonQuery.js";
import { generateToken, generateUserId } from "../utils/jwt.js";
import { sendEmail } from "../utils/email.js";
import User from "../Models/user.schema.js";
import {
  generateOTP,
  generateRandomUsername,
  buildUserResponse,
} from "../utils/userHelper.js";

/**
 * Check if email is already registered and if it has a password set.
 * Route: POST /api/user/check-email
 */
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: false, message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: true,
    });

    if (user) {
      return res.status(200).json({
        status: true,
        exists: true,
        hasPassword: !!user.password,
        providers: {
          google: !!user.googleId,
          discord: !!user.discordId,
        },
      });
    }

    return res.status(200).json({ status: true, exists: false });
  } catch (error) {
    console.error("Check Email Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Register a new user (email signup) or update/link OAuth user.
 * Route: POST /api/user/register
 */
export const registerUser = async (req, res) => {
  try {
    const { fullname, email, password, referredBy } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).json({ status: false, message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: false,
    });

    if (user) {
      if (!user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.fullname = fullname.trim();
        user.username = await generateRandomUsername();
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
        if (referredBy) {
          user.referredBy = referredBy.trim();
        }
        await user.save();

        try {
          await sendEmail({
            to: user.email,
            templateIdentifier: "otp-verification",
            replacements: {
              fullname: user.fullname,
              otp: otp,
            },
          });
        } catch (mailErr) {
          console.error("Failed to send verification email (OAuth link):", mailErr);
        }

        return res.status(200).json({
          status: true,
          message: "OTP sent to your email for verification.",
          requiresOtp: true,
          email: user.email,
          otpExpiresAt: user.otpExpiresAt.toISOString(),
        });
      }

      if (!user.isVerified) {
        if (user.otp && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
          return res.status(200).json({
            message: "OTP already sent. Please check your email.",
            status: true,
            email: user.email,
            otpExpiresAt: user.otpExpiresAt.toISOString(),
          });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.fullname = fullname.trim();
        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
        if (referredBy) {
          user.referredBy = referredBy.trim();
        }
        await user.save();

        try {
          await sendEmail({
            to: user.email,
            templateIdentifier: "otp-verification",
            replacements: {
              fullname: user.fullname,
              otp: otp,
            },
          });
        } catch (mailErr) {
          console.error("Failed to send verification email (Re-registration):", mailErr);
        }

        return res.status(200).json({
          message: "OTP sent to your email for verification.",
          status: true,
          email: user.email,
          otpExpiresAt: user.otpExpiresAt.toISOString(),
        });
      }

      return res.status(400).json({ status: false, message: "Email is already in use" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userId = await generateUserId();
    const generatedUsername = await generateRandomUsername();
    const otp = generateOTP();

    const newUserDoc = await dbCommonQuery({
      model: "User",
      action: "create",
      data: {
        username: generatedUsername,
        fullname: fullname.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        userId: userId,
        avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`,
        otp: otp,
        otpExpiresAt: new Date(Date.now() + 3 * 60 * 1000),
        referredBy: referredBy ? referredBy.trim() : undefined,
      },
    });

    try {
      await sendEmail({
        to: newUserDoc.email,
        templateIdentifier: "otp-verification",
        replacements: {
          fullname: newUserDoc.fullname,
          otp: otp,
        },
      });
    } catch (mailErr) {
      console.error("Failed to send verification email (Registration):", mailErr);
    }

    return res.status(201).json({
      message: "OTP sent to your email for verification.",
      status: true,
      email: newUserDoc.email,
      otpExpiresAt: newUserDoc.otpExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Verify OTP submitted by the user.
 * Route: POST /api/user/verify-otp
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ status: false, message: "Email and OTP are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: false,
    });

    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    if (!user.otp) {
      return res.status(400).json({ status: false, message: "No OTP was requested for this account" });
    }

    if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();
      return res.status(400).json({ status: false, message: "OTP has expired. Please request a new one." });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

    let userId;
    if (!user.userId) {
      userId = await generateUserId();
    }

    const wasVerified = user.isVerified;

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    if (!user.userId) {
      user.userId = userId;
    }
    await user.save();

    if (!wasVerified && user.referredBy) {
      const referrer = await dbCommonQuery({
        model: "User",
        action: "findOne",
        filter: { userId: user.referredBy },
        lean: false,
      });
      if (referrer) {
        referrer.synergy = (referrer.synergy || 0) + 5;
        await referrer.save();
      }
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      message: "Email verified successfully",
      user: buildUserResponse(user),
      token,
      status: true,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Resend OTP code to user.
 * Route: POST /api/user/resend-otp
 */
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: false, message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: false,
    });

    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ status: false, message: "User is already verified" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        templateIdentifier: "otp-verification",
        replacements: {
          fullname: user.fullname || user.username || "Otaku User",
          otp: otp,
        },
      });
    } catch (mailErr) {
      console.error("Failed to send resend OTP email:", mailErr);
    }

    return res.status(200).json({
      status: true,
      message: "New OTP sent to your email.",
      email: user.email,
      otpExpiresAt: user.otpExpiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Login user with email & password.
 * Route: POST /api/user/login
 */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: false, message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: false,
    });

    if (!user) {
      return res.status(400).json({ status: false, message: "Invalid email or password" });
    }

    if (!user.password) {
      const providers = [];
      if (user.googleId) providers.push("Google");
      if (user.discordId) providers.push("Discord");

      return res.status(400).json({
        status: false,
        message: `This account is linked with ${providers.join(" or ") || "social login"}. Please sign in using your social account, or set a password first.`,
        oauthOnly: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: false, message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      if (user.otp && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
        return res.status(200).json({
          message: "OTP already sent. Please check your email.",
          requiresOtp: true,
          email: user.email,
          otpExpiresAt: user.otpExpiresAt.toISOString(),
          status: true,
        });
      }

      const otp = generateOTP();
      user.otp = otp;
      user.otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);
      await user.save();

      try {
        await sendEmail({
          to: user.email,
          templateIdentifier: "otp-verification",
          replacements: {
            fullname: user.fullname,
            otp: otp,
          },
        });
      } catch (mailErr) {
        console.error("Failed to send OTP verification email during login:", mailErr);
      }

      return res.status(200).json({
        message: "Your email is not verified. OTP sent to your email for verification.",
        requiresOtp: true,
        email: user.email,
        otpExpiresAt: user.otpExpiresAt.toISOString(),
        status: true,
      });
    }

    const token = generateToken(user._id);
    return res.status(200).json({
      message: "Login successful",
      user: buildUserResponse(user),
      token,
      status: true,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Google & Discord OAuth handler.
 * Route: POST /api/user/oauth
 */
export const oauthLoginOrSignup = async (req, res, next) => {
  try {
    const { provider } = req.body;

    if (provider === "google") {
      passport.authenticate("google-id-token", { session: false }, async (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ status: false, message: info?.message || "Google Authentication failed" });
        }

        const token = generateToken(user._id);
        return res.status(200).json({
          status: true,
          message: "Google login successful",
          user: buildUserResponse(user),
          token,
        });
      })(req, res, next);
    } else if (provider === "discord") {
      let { email, username, providerId, avatar, referredBy, code, redirectUri } = req.body;

      if (code) {
        try {
          const tokenResponse = await axios.post(
            "https://discord.com/api/oauth2/token",
            new URLSearchParams({
              client_id: process.env.DISCORD_CLIENT_ID,
              client_secret: process.env.DISCORD_CLIENT_SECRET,
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri || "http://localhost:3000",
            }),
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );

          const { access_token } = tokenResponse.data;
          const userResponse = await axios.get("https://discord.com/api/users/@me", {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          const discordUser = userResponse.data;
          email = discordUser.email;
          username = discordUser.username;
          providerId = discordUser.id;
          avatar = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || "0", 10) % 5}.png`;

          if (!email) {
            return res.status(400).json({ status: false, message: "Discord account must have a verified email address." });
          }
        } catch (exchangeErr) {
          console.error("Discord exchange error details:", exchangeErr.response?.data || exchangeErr.message);
          return res.status(401).json({ status: false, message: "Failed to authenticate with Discord" });
        }
      }

      if (!email || !providerId) {
        return res.status(400).json({ status: false, message: "Email and provider ID are required for Discord OAuth" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      let user = await dbCommonQuery({
        model: "User",
        action: "findOne",
        filter: { email: normalizedEmail },
        lean: false,
      });

      if (user) {
        let updated = false;
        if (!user.discordId) {
          user.discordId = providerId;
          updated = true;
        }
        if (avatar && !user.avatar) {
          user.avatar = avatar;
          updated = true;
        }
        if (!user.isVerified) {
          user.isVerified = true;
          updated = true;
        }
        if (!user.userId) {
          user.userId = await generateUserId();
          updated = true;
        }
        if (updated) await user.save();
      } else {
        const generatedUsername = await generateRandomUsername();
        const newUserId = await generateUserId();
        user = await dbCommonQuery({
          model: "User",
          action: "create",
          data: {
            username: generatedUsername,
            userId: newUserId,
            email: normalizedEmail,
            fullname: username ? username.trim() : "",
            avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${generatedUsername}`,
            discordId: providerId,
            isVerified: true,
            referredBy: referredBy ? referredBy.trim() : undefined,
          },
        });

        if (referredBy) {
          const referrer = await dbCommonQuery({
            model: "User",
            action: "findOne",
            filter: { userId: referredBy.trim() },
            lean: false,
          });
          if (referrer) {
            referrer.synergy = (referrer.synergy || 0) + 5;
            await referrer.save();
          }
        }
      }

      const token = generateToken(user._id);
      return res.status(200).json({
        status: true,
        message: "Discord login successful",
        user: buildUserResponse(user),
        token,
      });
    } else {
      return res.status(400).json({ status: false, message: "Invalid OAuth provider" });
    }
  } catch (error) {
    console.error("OAuth Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Generate unique random tag suggestion.
 * Route: GET /api/user/generate-username
 */
export const generateUsername = async (req, res) => {
  try {
    const username = await generateRandomUsername();
    return res.status(200).json({
      status: true,
      username,
    });
  } catch (error) {
    console.error("Generate Username Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Forgot password request (send OTP).
 * Route: POST /api/user/forgot-password
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ status: false, message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: false,
    });

    if (!user) {
      return res.status(400).json({ status: false, message: "User with this email not found" });
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
    user.resetPasswordOtpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    try {
      await sendEmail({
        to: user.email,
        templateIdentifier: "forgot-password",
        replacements: {
          fullname: user.fullname || user.username || "Otaku User",
          otp: otp,
        },
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
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Reset password with OTP code.
 * Route: POST /api/user/reset-password
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ status: false, message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await dbCommonQuery({
      model: "User",
      action: "findOne",
      filter: { email: normalizedEmail },
      lean: false,
    });

    if (!user) {
      return res.status(400).json({ status: false, message: "User not found" });
    }

    if (!user.resetPasswordOtp) {
      return res.status(400).json({ status: false, message: "No password reset request found" });
    }

    if (user.resetPasswordOtpExpiresAt && user.resetPasswordOtpExpiresAt < new Date()) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpiresAt = undefined;
      await user.save();
      return res.status(400).json({ status: false, message: "Reset code has expired. Please request a new one." });
    }

    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid reset code" });
    }

    if (user.password) {
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ status: false, message: "New password cannot be the same as your current password" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpiresAt = undefined;
    user.isVerified = true;

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
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Retrieve authenticated user details.
 * Route: GET /api/user/me
 */
export const getMe = async (req, res) => {
  try {
    const user = await dbCommonQuery({
      model: "User",
      action: "findById",
      filter: req.user._id,
      lean: false,
    });

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const { pendingOrderId, pendingPlanId } = req.query;
    let paymentVerified = false;
    let updatedUser = user;

    if (pendingOrderId) {
      const existingPayment = await dbCommonQuery({
        model: "Payment",
        action: "findOne",
        filter: {
          razorpay_order_id: pendingOrderId,
          status: "verified",
        },
        lean: true,
      });

      if (existingPayment) {
        paymentVerified = true;
      } else if (pendingPlanId) {
        const razorpay = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        try {
          const payments = await razorpay.orders.fetchPayments(pendingOrderId);
          const capturedPayment = payments.items?.find((p) => p.status === "captured");

          if (capturedPayment) {
            const plan = await dbCommonQuery({
              model: "Plan",
              action: "findOne",
              filter: { planId: pendingPlanId },
              lean: true,
            });

            if (plan) {
              const isGirl = user.gender && ["female", "girl", "woman"].includes(user.gender.toLowerCase().trim());
              const multiplier = isGirl ? 2 : 1;

              const complimentsAdded = plan.complimentsRefill * multiplier;
              user.complimentsBalance = (user.complimentsBalance !== undefined ? user.complimentsBalance : 1) + complimentsAdded;

              let extraSwipesAdded = 0;
              if (plan.planId === "mana-drop") {
                extraSwipesAdded = 15 * multiplier;
                user.extraSwipesBalance = (user.extraSwipesBalance || 0) + extraSwipesAdded;
              }

              let superLikesAdded = 0;
              if (plan.planId === "mana-drop") {
                superLikesAdded = 1 * multiplier;
              } else if (plan.planId === "power-surge") {
                superLikesAdded = 3 * multiplier;
              } else if (plan.planId === "otaku-pass") {
                superLikesAdded = 5 * multiplier;
              }
              user.superLikesBalance = (user.superLikesBalance !== undefined ? user.superLikesBalance : 1) + superLikesAdded;

              if (plan.isPremium) {
                user.isPremium = true;
              }

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
              updatedUser = user;

              await dbCommonQuery({
                model: "Payment",
                action: "create",
                data: {
                  user: user._id,
                  planId: pendingPlanId,
                  razorpay_payment_id: capturedPayment.id,
                  razorpay_order_id: pendingOrderId,
                  razorpay_signature: "api_verified",
                  amount: plan.price * 100,
                  status: "verified",
                },
              });

              paymentVerified = true;
            }
          }
        } catch (err) {
          console.error("Razorpay verification inside getMe failed:", err);
        }
      }
    }

    return res.status(200).json({
      status: true,
      user: buildUserResponse(updatedUser),
      paymentVerified,
    });
  } catch (error) {
    console.error("Get Me Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
