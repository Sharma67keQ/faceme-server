import { Server, Socket } from "socket.io";
import { prisma } from "../lib/prisma.js";
import { chatService } from "../services/chat.service.js";
import { verifyAccessToken } from "../utils/jwt.js";

type AuthedSocket = Socket & {
  data: {
    userId?: string;
    username?: string;
  };
};

export const registerChatSocket = (io: Server) => {
  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Unauthorized"));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      socket.data.username = payload.username;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    const userId = socket.data.userId!;

    socket.join(`user:${userId}`);
    void prisma.user.update({
      where: { id: userId },
      data: { presenceStatus: "ONLINE" },
    });
    io.emit("presence:update", { userId, status: "ONLINE" });

    socket.on("conversation:join", async (conversationId: string) => {
      await chatService.ensureParticipant(userId, conversationId);
      socket.join(`conversation:${conversationId}`);

       const deliveredStatuses = await prisma.messageStatus.findMany({
        where: {
          userId,
          status: "SENT",
          message: {
            conversationId,
            senderId: {
              not: userId,
            },
          },
        },
        select: {
          messageId: true,
        },
      });

      await prisma.messageStatus.updateMany({
        where: {
          userId,
          status: "SENT",
          message: {
            conversationId,
            senderId: {
              not: userId,
            },
          },
        },
        data: {
          status: "DELIVERED",
        },
      });

      deliveredStatuses.forEach((status: (typeof deliveredStatuses)[number]) => {
        io.to(`conversation:${conversationId}`).emit("message:status", {
          conversationId,
          messageId: status.messageId,
          userId,
          status: "DELIVERED",
        });
      });
    });

    socket.on(
      "message:send",
      async (payload: {
        conversationId: string;
        text?: string;
        mediaUrl?: string;
        type?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO";
        replyToMessageId?: string;
      }) => {
        const message = await chatService.createMessage(prisma, userId, payload.conversationId, {
          text: payload.text,
          mediaUrl: payload.mediaUrl,
          type: payload.type,
          replyToMessageId: payload.replyToMessageId,
        });

        io.to(`conversation:${payload.conversationId}`).emit("message:new", message);
      },
    );

    socket.on("typing:start", (payload: { conversationId: string }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("typing:update", {
        conversationId: payload.conversationId,
        userId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", (payload: { conversationId: string }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("typing:update", {
        conversationId: payload.conversationId,
        userId,
        isTyping: false,
      });
    });

    socket.on("message:seen", async (payload: { conversationId: string; messageId: string }) => {
      await prisma.messageStatus.updateMany({
        where: {
          messageId: payload.messageId,
          userId,
        },
        data: {
          status: "SEEN",
        },
      });

      await prisma.conversationParticipant.updateMany({
        where: {
          conversationId: payload.conversationId,
          userId,
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      io.to(`conversation:${payload.conversationId}`).emit("message:status", {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
        userId,
        status: "SEEN",
      });
    });

    socket.on("call:offer", (payload: { conversationId: string; offer: unknown }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("call:offer", {
        conversationId: payload.conversationId,
        userId,
        offer: payload.offer,
      });
    });

    socket.on("call:answer", (payload: { conversationId: string; answer: unknown }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("call:answer", {
        conversationId: payload.conversationId,
        userId,
        answer: payload.answer,
      });
    });

    socket.on("call:ice-candidate", (payload: { conversationId: string; candidate: unknown }) => {
      socket.to(`conversation:${payload.conversationId}`).emit("call:ice-candidate", {
        conversationId: payload.conversationId,
        userId,
        candidate: payload.candidate,
      });
    });

    socket.on("disconnect", () => {
      void prisma.user.update({
        where: { id: userId },
        data: { presenceStatus: "OFFLINE" },
      });
      io.emit("presence:update", { userId, status: "OFFLINE" });
    });
  });
};
