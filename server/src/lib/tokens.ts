import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms";
import { env } from "./env.js";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  username: string;
};

const signToken = (
  payload: AuthTokenPayload,
  secret: Secret,
  expiresIn: string,
) =>
  jwt.sign(payload, secret, {
    expiresIn: expiresIn as StringValue | number,
  } satisfies SignOptions);

export const createAccessToken = (payload: AuthTokenPayload) =>
  signToken(payload, env.JWT_ACCESS_SECRET, env.JWT_ACCESS_EXPIRES_IN);

export const createRefreshToken = (payload: AuthTokenPayload) =>
  signToken(payload, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_EXPIRES_IN);

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthTokenPayload;
