declare namespace Express {
  interface Request {
    requestId?: string;
    user?: {
      id: string;
      username: string;
      role: "USER" | "MODERATOR" | "ADMIN";
      suspendedAt?: string | null;
      bannedAt?: string | null;
    };
  }
}
