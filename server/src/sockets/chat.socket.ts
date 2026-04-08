import type { Server } from "socket.io";

export const registerChatSocket = (io: Server) => {
  io.on("connection", (socket: {
    join: (room: string) => void;
    leave: (room: string) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
  }) => {
    socket.on("chat:join", (conversationId: string) => {
      socket.join(conversationId);
    });

    socket.on("chat:leave", (conversationId: string) => {
      socket.leave(conversationId);
    });
  });
};
