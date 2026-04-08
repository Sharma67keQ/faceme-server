import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { registerChatSocket } from "./sockets/chat.socket.js";

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true,
  },
} as any);

registerChatSocket(io);

httpServer.listen(env.PORT, () => {
  console.log(`FaceMe server listening on port ${env.PORT}`);
});

const shutdown = async () => {
  io.close();
  httpServer.close();
  await prisma.$disconnect();
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
