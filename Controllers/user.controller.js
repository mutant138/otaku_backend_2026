import * as authController from "./auth.controller.js";
import * as profileController from "./profile.controller.js";
import * as matchmakingController from "./matchmaking.controller.js";
import * as chatController from "./chat.controller.js";
import * as paymentController from "./payment.controller.js";
import * as feedbackController from "./feedback.controller.js";
import * as pushController from "./push.controller.js";

// Re-export Push Notification Controller methods
export const getVapidPublicKey = pushController.getVapidPublicKey;
export const subscribePush = pushController.subscribePush;
export const unsubscribePush = pushController.unsubscribePush;
export const sendTestPush = pushController.sendTestPush;

// Re-export Auth Controller methods
export const checkEmail = authController.checkEmail;
export const registerUser = authController.registerUser;
export const verifyOtp = authController.verifyOtp;
export const resendOtp = authController.resendOtp;
export const loginUser = authController.loginUser;
export const oauthLoginOrSignup = authController.oauthLoginOrSignup;
export const forgotPassword = authController.forgotPassword;
export const resetPassword = authController.resetPassword;
export const generateUsername = authController.generateUsername;
export const getMe = authController.getMe;
export const refreshToken = authController.refreshToken;
export const logoutUser = authController.logoutUser;


// Re-export Profile Controller methods
export const onboardUser = profileController.onboardUser;
export const getMetadata = profileController.getMetadata;
export const updateProfile = profileController.updateProfile;
export const uploadAvatar = profileController.uploadAvatar;
export const uploadPhoto = profileController.uploadPhoto;
export const deletePhoto = profileController.deletePhoto;
export const getCountries = profileController.getCountries;
export const getStates = profileController.getStates;
export const getCities = profileController.getCities;
export const getUserProfile = profileController.getUserProfile;
export const searchAnimeTitles = profileController.searchAnimeTitles;
export const searchGameTitles = profileController.searchGameTitles;

// Re-export Matchmaking Controller methods
export const getCandidates = matchmakingController.getCandidates;
export const swipeUser = matchmakingController.swipeUser;
export const reportUser = matchmakingController.reportUser;
export const getLobbyLikes = matchmakingController.getLobbyLikes;

// Re-export Chat Controller methods
export const getLobbyChats = chatController.getLobbyChats;
export const getChatMessages = chatController.getChatMessages;
export const sendChatMessage = chatController.sendChatMessage;

// Re-export Payment Controller methods
export const getPlans = paymentController.getPlans;
export const createOrder = paymentController.createOrder;
export const fulfillSubscriptionPlan = paymentController.fulfillSubscriptionPlan;
export const verifyPayment = paymentController.verifyPayment;
export const handleRazorpayWebhook = paymentController.handleRazorpayWebhook;
export const redeemPlan = paymentController.redeemPlan;

// Re-export Feedback Controller methods
export const submitFeedback = feedbackController.submitFeedback;

export default {
  checkEmail,
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  oauthLoginOrSignup,
  forgotPassword,
  resetPassword,
  generateUsername,
  getMe,
  refreshToken,
  logoutUser,
  onboardUser,
  getMetadata,
  updateProfile,
  uploadAvatar,
  uploadPhoto,
  deletePhoto,
  getCountries,
  getStates,
  getCities,
  getUserProfile,
  searchAnimeTitles,
  searchGameTitles,
  getCandidates,
  swipeUser,
  reportUser,
  getLobbyLikes,
  getLobbyChats,
  getChatMessages,
  sendChatMessage,
  getPlans,
  createOrder,
  fulfillSubscriptionPlan,
  verifyPayment,
  handleRazorpayWebhook,
  redeemPlan,
  submitFeedback,
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  sendTestPush,
};

