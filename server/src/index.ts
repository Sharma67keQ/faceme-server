import { createServer } from "node:http";
import { Server } from "socket.io";
import { app } from "./app.js";
import { env } from "./lib/env.js";
import { registerChatSocket } from "./sockets/chat.socket.js";

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_ORIGINS,
    credentials: true,
  },
});

registerChatSocket(io);

httpServer.listen(env.PORT, () => {
  console.log(`Faceme server running on port ${env.PORT}`);
});
