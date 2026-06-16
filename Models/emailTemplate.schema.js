import mongoose from "mongoose";

const emailTemplateSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    unique: true,
  },
  subject: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model("EmailTemplate", emailTemplateSchema);
