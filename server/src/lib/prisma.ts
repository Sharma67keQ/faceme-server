import { PrismaClient } from "@prisma/client";

declare global {
  var __facemePrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__facemePrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__facemePrisma__ = prisma;
}
