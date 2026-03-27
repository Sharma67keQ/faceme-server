import { z } from "zod";
import { env } from "../lib/env.js";

export const trimmedString = (minimum = 1, maximum = 255) =>
  z.string().trim().min(minimum).max(maximum);

export const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/i, "Username may contain only letters, numbers, and underscores");

export const passwordSchema = z
  .string()
  .min(10)
  .max(72)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const humanNameSchema = trimmedString(2, 40);
export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase and hyphenated");

export const secureUrlSchema = z.string().trim().url().superRefine((value, ctx) => {
  if (env.APP_ENV === "production" && !value.startsWith("https://")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Production URLs must use HTTPS",
    });
  }
});
