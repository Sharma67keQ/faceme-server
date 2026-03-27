import { z } from "zod";
import { loadEnvironment } from "./load-env.js";

loadEnvironment();

const splitCsv = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.enum(["development", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGINS: z.string().min(1).default("http://localhost:8081"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  JWT_ISSUER: z.string().min(1).default("faceme-api"),
  JWT_AUDIENCE: z.string().min(1).default("faceme-mobile"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ALLOW_SEED_IN_PRODUCTION: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("faceme"),
  MEDIA_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
});

const parsedEnv = envSchema.parse({
  ...process.env,
  CLIENT_ORIGINS: process.env.CLIENT_ORIGINS ?? process.env.CLIENT_URL,
});

export const env = {
  ...parsedEnv,
  CLIENT_ORIGINS: splitCsv(parsedEnv.CLIENT_ORIGINS),
} as const;
