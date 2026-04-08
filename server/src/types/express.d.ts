import type { AuthTokenPayload } from "../lib/tokens.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

export {};
