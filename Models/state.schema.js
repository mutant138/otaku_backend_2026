import mongoose from "mongoose";

const stateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure state name is unique within a country
stateSchema.index({ name: 1, country: 1 }, { unique: true });

const State = mongoose.model("State", stateSchema);
export default State;
