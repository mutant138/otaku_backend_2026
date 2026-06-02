import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: "otaku",
    });

    console.log("MongoDB connected");
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;