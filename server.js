import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./db.js";
import userRoutes from "./Routes/user.routes.js";
import { initSocket } from "./socket/socket.js";

dotenv.config();

const app = express();

// Apply security headers (allow cross-origin resource sharing for static files)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Configure CORS with allowed origins list
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3005",
  "http://localhost:5173",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("http://localhost:")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware to sanitize inputs and prevent NoSQL query injection (in-place mutation to support Express 5 query getters)
const mongoSanitizeMiddleware = (req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === "object") {
      for (const key in obj) {
        if (key.startsWith("$")) {
          delete obj[key];
        } else {
          sanitize(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
};

app.use(mongoSanitizeMiddleware);

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  message: { status: false, message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window
  message: { status: false, message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", generalLimiter);
app.use("/api/user/login", authLimiter);
app.use("/api/user/register", authLimiter);
app.use("/api/user/verify-otp", authLimiter);
app.use("/api/user/check-email", authLimiter);

app.use("/public", express.static("public"));

// Routes
app.use("/api/user", userRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err.stack || err);
  
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ status: false, message: "File size exceeds the 5MB limit." });
  }
  
  res.status(err.status || 500).json({
    status: false,
    message: err.message || "Internal server error"
  });
});

const server = http.createServer(app);
initSocket(server);

(async () => {
  await connectDB();
  server.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
})().catch((err) => {
  console.log(err);
});