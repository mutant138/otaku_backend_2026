import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  planId: {
    type: String,
    required: true,
    enum: ["mana-drop", "power-surge", "otaku-pass"],
  },
  razorpay_payment_id: {
    type: String,
    required: true,
  },
  razorpay_order_id: {
    type: String,
    required: true,
  },
  razorpay_signature: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true, // in paise
  },
  status: {
    type: String,
    enum: ["created", "verified", "failed"],
    default: "verified",
  }
}, {
  timestamps: true,
});

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
