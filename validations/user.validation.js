export const checkEmailSchema = {
  email: { type: "email", required: true },
};

export const registerSchema = {
  fullname: { type: "string", required: true },
  email: { type: "email", required: true },
  password: { type: "string", required: true },
};

export const verifyOtpSchema = {
  email: { type: "email", required: true },
  otp: { type: "string", required: true },
};

export const resendOtpSchema = {
  email: { type: "email", required: true },
};

export const loginSchema = {
  email: { type: "email", required: true },
  password: { type: "string", required: true },
};

export const forgotPasswordSchema = {
  email: { type: "email", required: true },
};

export const resetPasswordSchema = {
  email: { type: "email", required: true },
  otp: { type: "string", required: true },
  newPassword: { type: "string", required: true },
};

export const oauthSchema = {
  provider: {
    type: "string",
    required: true,
    enum: ["google", "discord"],
    validate: (value, body) => {
      if (value === "google") {
        if (!body.credential && !body.accessToken) {
          return "Google ID token credential or accessToken is required";
        }
      } else if (value === "discord") {
        if (!body.code) {
          if (!body.email) {
            return "Email or authorization code is required for Discord OAuth";
          }
          if (!body.providerId) {
            return "Provider ID is required for Discord OAuth";
          }
        }
      }
    }
  },
};

export const onboardSchema = {
  preferences: {
    type: "object",
    required: true,
    validate: (value) => {
      if (!value.path) {
        return "preferences.path is required";
      }
      if (!["anime", "game", "both"].includes(value.path)) {
        return "preferences.path must be one of: anime, game, both";
      }
    }
  }
};

export const updateProfileSchema = {
  email: { type: "email", required: false },
  age: { type: "number", required: false },
  gender: { type: "string", required: false },
  fullname: { type: "string", required: false },
  location: { type: "string", required: false },
  locationDetails: { type: "object", required: false },
  bio: { type: "string", required: false },
  username: { type: "string", required: false },
};

export const deletePhotoSchema = {
  photoUrl: { type: "string", required: true },
};

export const swipeUserSchema = {
  swipeeId: { type: "string", required: true },
  swipeType: { type: "string", required: true, enum: ["like", "pass", "super"] },
  compliment: { type: "string", required: false },
};

export const createOrderSchema = {
  planId: { type: "string", required: true, enum: ["mana-drop", "power-surge", "otaku-pass"] },
};

export const verifyPaymentSchema = {
  razorpay_payment_id: { type: "string", required: true },
  razorpay_order_id: { type: "string", required: true },
  razorpay_signature: { type: "string", required: true },
  planId: { type: "string", required: true, enum: ["mana-drop", "power-surge", "otaku-pass"] },
};

export const redeemPlanSchema = {
  planId: { type: "string", required: true, enum: ["mana-drop", "power-surge"] },
};

export const sendChatMessageSchema = {
  receiverId: { type: "string", required: true },
  content: { type: "string", required: true },
};
