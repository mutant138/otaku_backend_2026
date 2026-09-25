import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { initDuelSocketHandlers } from "./duelManager.js";
import { initWordDuelSocketHandlers } from "./wordDuelManager.js";

let io;

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3005",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith("http://localhost:")) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  // Verify JWT token on connection & attach room
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return next(new Error("Authentication error: TokenExpiredError"));
      }
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    console.log(`Socket client ${socket.id} connected & joined room ${userRoom}`);

    // Attach 1v1 PvP Duel event handlers
    initDuelSocketHandlers(io, socket);
    initWordDuelSocketHandlers(io, socket);

    // Dynamic token renewal on live socket connection
    socket.on("auth_refresh_token", (data = {}) => {
      const newToken = data.token;
      if (!newToken) {
        return socket.emit("auth_error", { message: "Token missing during renewal." });
      }
      try {
        const decoded = jwt.verify(newToken, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        const currentRoom = `user:${decoded.id}`;
        socket.join(currentRoom);
        socket.emit("auth_token_refreshed", { status: true, userId: decoded.id });
        console.log(`Socket ${socket.id} successfully renewed auth token for user ${decoded.id}`);
      } catch (err) {
        console.warn(`Socket ${socket.id} token renewal rejected: Invalid token.`);
        socket.emit("auth_error", { message: "Invalid or expired token." });
      }
    });

    socket.on("register", (userId) => {
      if (userId && userId.toString() === socket.userId) {
        socket.join(userRoom);
        console.log(`User ${socket.userId} re-confirmed registration to room ${userRoom}`);
      } else {
        console.warn(`Socket registration rejected for ${socket.id}: Mismatched identity (Expected ${socket.userId}, got ${userId})`);
        socket.disconnect();
      }
    });


    socket.on("disconnect", () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const sendRealtimeMessage = (userId, message) => {
  if (!io) {
    console.warn("Socket.io is not initialized!");
    return false;
  }
  const userRoom = `user:${userId.toString()}`;
  io.to(userRoom).emit("new_message", message);
  console.log(`Emitted real-time message to room ${userRoom}`);
  return true;
};

export const sendRealtimeNotification = (userId, notification) => {
  if (!io) return false;
  const userRoom = `user:${userId.toString()}`;
  io.to(userRoom).emit("notification", notification);
  console.log(`Emitted real-time notification to room ${userRoom}`);
  return true;
};

export const sendRealtimeSwipeSync = (userId, data) => {
  if (!io) return false;
  const userRoom = `user:${userId.toString()}`;
  io.to(userRoom).emit("card_swiped", data);
  console.log(`Emitted real-time card swipe sync to room ${userRoom}`);
  return true;
};


