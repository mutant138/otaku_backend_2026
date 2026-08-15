import mongoose from "mongoose";
import dbCommonQuery from "../utils/dbCommonQuery.js";
import { buildPublicUserResponse } from "../utils/userHelper.js";

/**
 * Fetch active chat channels/lobby conversations.
 * Route: GET /api/user/lobby/chats
 */
export const getLobbyChats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const myLikes = await dbCommonQuery({
      model: "Swipe",
      action: "distinct",
      field: "swipee",
      filter: { swiper: currentUserId, swipeType: { $in: ["like", "super"] } },
    });

    const mutualLikes = await dbCommonQuery({
      model: "Swipe",
      action: "find",
      filter: {
        swiper: { $in: myLikes },
        swipee: currentUserId,
        swipeType: { $in: ["like", "super"] },
      },
      lean: true,
    });
    const mutualUserIds = mutualLikes.map((s) => s.swiper.toString());

    const [chatUsers, chatUsers2] = await Promise.all([
      dbCommonQuery({
        model: "Message",
        action: "distinct",
        field: "sender",
        filter: { $or: [{ sender: currentUserId }, { receiver: currentUserId }] },
      }),
      dbCommonQuery({
        model: "Message",
        action: "distinct",
        field: "receiver",
        filter: { $or: [{ sender: currentUserId }, { receiver: currentUserId }] },
      }),
    ]);

    const allChatUserIds = Array.from(new Set([...chatUsers, ...chatUsers2]))
      .map((id) => id.toString())
      .filter((id) => id !== currentUserId.toString());

    const allChannelUserIds = Array.from(new Set([...mutualUserIds, ...allChatUserIds]));

    const channels = [];
    for (const userId of allChannelUserIds) {
      const otherUser = await dbCommonQuery({
        model: "User",
        action: "findById",
        filter: userId,
        projection:
          "username avatar profilePics isVerified fullname gender age location bio preferences height weight education drinking smoking lookingFor kids politics isPremium activeSubscription userId",
        lean: true,
      });

      if (!otherUser) continue;

      const latestMessage = await dbCommonQuery({
        model: "Message",
        action: "findOne",
        filter: {
          $or: [
            { sender: currentUserId, receiver: userId },
            { sender: userId, receiver: currentUserId },
          ],
        },
        sort: { createdAt: -1 },
        lean: true,
      });

      const isMutual = mutualUserIds.includes(userId);
      const currentSentMessageCount = await dbCommonQuery({
        model: "Message",
        action: "countDocuments",
        filter: { sender: currentUserId, receiver: userId },
      });
      const isIncomingRequest = !isMutual && currentSentMessageCount === 0;

      channels.push({
        user: buildPublicUserResponse(otherUser),
        latestMessage: latestMessage
          ? {
              id: latestMessage._id,
              content: latestMessage.content,
              sender: latestMessage.sender,
              receiver: latestMessage.receiver,
              isRead: latestMessage.isRead,
              createdAt: latestMessage.createdAt,
            }
          : null,
        isIncomingRequest,
        isMutual,
      });
    }

    channels.sort((a, b) => {
      const timeA = a.latestMessage ? new Date(a.latestMessage.createdAt) : new Date(0);
      const timeB = b.latestMessage ? new Date(b.latestMessage.createdAt) : new Date(0);
      return timeB - timeA;
    });

    return res.status(200).json({ status: true, channels });
  } catch (error) {
    console.error("Get Lobby Chats Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Fetch chat history messages between current user and target user.
 * Route: GET /api/user/lobby/messages/:otherUserId
 */
export const getChatMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { otherUserId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ status: false, message: "Invalid target user ID" });
    }

    const [myLike, otherLike] = await Promise.all([
      dbCommonQuery({
        model: "Swipe",
        action: "findOne",
        filter: { swiper: currentUserId, swipee: otherUserId, swipeType: { $in: ["like", "super"] } },
        lean: true,
      }),
      dbCommonQuery({
        model: "Swipe",
        action: "findOne",
        filter: { swiper: otherUserId, swipee: currentUserId, swipeType: { $in: ["like", "super"] } },
        lean: true,
      }),
    ]);
    const isMutual = myLike && otherLike;

    const currentSentMessageCount = await dbCommonQuery({
      model: "Message",
      action: "countDocuments",
      filter: { sender: currentUserId, receiver: otherUserId },
    });
    const isIncomingRequest = !isMutual && currentSentMessageCount === 0;

    const hasWeeklyPass =
      req.user.activeSubscription &&
      req.user.activeSubscription.planId === "otaku-pass" &&
      new Date(req.user.activeSubscription.expiresAt) > new Date();

    if (isIncomingRequest && !hasWeeklyPass) {
      return res.status(403).json({
        status: false,
        needsWeeklyPass: true,
        message: "Incoming chat request locked. Upgrade to Otaku Pass to view and reply!",
      });
    }

    const messages = await dbCommonQuery({
      model: "Message",
      action: "find",
      filter: {
        $or: [
          { sender: currentUserId, receiver: otherUserId },
          { sender: otherUserId, receiver: currentUserId },
        ],
      },
      sort: { createdAt: 1 },
      lean: true,
    });

    await dbCommonQuery({
      model: "Message",
      action: "updateMany",
      filter: { sender: otherUserId, receiver: currentUserId, isRead: false },
      data: { $set: { isRead: true } },
    });

    return res.status(200).json({ status: true, messages });
  } catch (error) {
    console.error("Get Chat Messages Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};

/**
 * Send a chat message to a user.
 * Route: POST /api/user/lobby/messages
 */
export const sendChatMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ status: false, message: "Receiver ID and message content are required" });
    }

    const [myLike, otherLike] = await Promise.all([
      dbCommonQuery({
        model: "Swipe",
        action: "findOne",
        filter: { swiper: currentUserId, swipee: receiverId, swipeType: { $in: ["like", "super"] } },
        lean: true,
      }),
      dbCommonQuery({
        model: "Swipe",
        action: "findOne",
        filter: { swiper: receiverId, swipee: currentUserId, swipeType: { $in: ["like", "super"] } },
        lean: true,
      }),
    ]);
    const isMutual = myLike && otherLike;

    const currentSentMessageCount = await dbCommonQuery({
      model: "Message",
      action: "countDocuments",
      filter: { sender: currentUserId, receiver: receiverId },
    });
    const isIncomingRequest = !isMutual && currentSentMessageCount === 0;

    const hasWeeklyPass =
      req.user.activeSubscription &&
      req.user.activeSubscription.planId === "otaku-pass" &&
      new Date(req.user.activeSubscription.expiresAt) > new Date();

    if (isIncomingRequest && !hasWeeklyPass) {
      return res.status(403).json({
        status: false,
        needsWeeklyPass: true,
        message: "Incoming chat request locked. Upgrade to Otaku Pass to view and reply!",
      });
    }

    const newMessage = await dbCommonQuery({
      model: "Message",
      action: "create",
      data: {
        sender: currentUserId,
        receiver: receiverId,
        content: content.trim(),
        isRead: false,
      },
    });

    const { sendRealtimeMessage } = await import("../socket/socket.js");
    sendRealtimeMessage(receiverId, newMessage);

    return res.status(201).json({
      status: true,
      message: "Message sent successfully",
      newMessage,
      complimentsBalance: req.user.complimentsBalance,
    });
  } catch (error) {
    console.error("Send Chat Message Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
