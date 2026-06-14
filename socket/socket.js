import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;
const userSockets = new Map(); // userId -> socketId

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Verify JWT token on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id; // Store verified userId (user._id) on the socket
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Socket client connected:", socket.id, "Verified User:", socket.userId);

    socket.on("register", (userId) => {
      // Validate that the registration payload matches the verified token identity
      if (userId && userId.toString() === socket.userId) {
        userSockets.set(socket.userId, socket.id);
        console.log(`Registered authenticated user ${socket.userId} to socket ${socket.id}`);
      } else {
        console.warn(`Socket registration rejected for ${socket.id}: Mismatched identity (Expected ${socket.userId}, got ${userId})`);
        socket.disconnect();
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket client disconnected:", socket.id);
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`Unregistered user ${userId}`);
          break;
        }
      }
    });
  });

  return io;
};

export const sendRealtimeMessage = (userId, message) => {
  if (!io) {
    console.warn("Socket.io is not initialized!");
    return false;
  }
  const socketId = userSockets.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit("new_message", message);
    console.log(`Sent real-time message to user ${userId}`);
    return true;
  }
  console.log(`User ${userId} is offline, message not sent in real-time`);
  return false;
};
