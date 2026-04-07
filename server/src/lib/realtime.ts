import type { Server } from "socket.io";

let realtimeServer: Server | null = null;

export const setRealtimeServer = (io: Server) => {
  realtimeServer = io;
};

export const emitRealtime = (event: string, payload: unknown) => {
  realtimeServer?.emit(event, payload);
};

export const emitRealtimeToUser = (userId: string, event: string, payload: unknown) => {
  realtimeServer?.to(`user:${userId}`).emit(event, payload);
};

export const emitRealtimeToRoom = (room: string, event: string, payload: unknown) => {
  realtimeServer?.to(room).emit(event, payload);
};
