import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client") as {
  PrismaClient: new (options?: { log?: string[] }) => any;
};

const globalForPrisma = globalThis as {
  prisma?: any;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ["warn", "error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
