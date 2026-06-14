import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true, // in INR
  },
  originalPrice: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["refill", "subscription"],
  },
  durationDays: {
    type: Number,
    required: true, // 0 for refills (no duration limit), >0 for subscriptions
    default: 0,
  },
  benefits: [{
    _id: false,
    text: { type: String, required: true },
    iconName: { type: String, required: true },
  }],
  complimentsRefill: {
    type: Number,
    required: true,
    default: 0,
  },
  isPremium: {
    type: Boolean,
    required: true,
    default: false,
  }
}, {
  timestamps: true,
});

const Plan = mongoose.model("Plan", planSchema);
export default Plan;
