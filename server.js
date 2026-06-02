import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db.js";
import userRoutes from "./Routes/user.routes.js";

dotenv.config();


const app = express();

app.use(cors({
    origin: "*",
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", express.static("public"));

// Routes
app.use("/api/user", userRoutes);

app.get("/", (req, res) => {
    res.send("Hello World!");
});


(async () => {
    await connectDB();
    app.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})().catch((err) => {
    console.log(err);
});