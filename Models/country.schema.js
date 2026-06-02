import mongoose from "mongoose";

const countrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    flag: {
      type: String,
      required: true, // Emoji flag e.g. 🇮🇳
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

const Country = mongoose.model("Country", countrySchema);
export default Country;
