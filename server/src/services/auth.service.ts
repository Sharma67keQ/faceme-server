import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/api-error.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

type RegisterInput = {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName?: string;
};

type LoginInput = {
  email: string;
  password: string;
};

const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  firstName: true,
  lastName: true,
  bio: true,
  avatarUrl: true,
  coverImageUrl: true,
  isOnboardingComplete: true,
  accountType: true,
  preferredLanguage: true,
  profileVisibility: true,
  role: true,
  suspendedAt: true,
  bannedAt: true,
  createdAt: true,
} as const;

const assertAccountIsActive = (user: { suspendedAt: Date | null; bannedAt: Date | null }) => {
  if (user.bannedAt) {
    throw new ApiError(StatusCodes.FORBIDDEN, "This account has been banned");
  }

  if (user.suspendedAt) {
    throw new ApiError(StatusCodes.FORBIDDEN, "This account is suspended");
  }
};

export const authService = {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email }, { username: input.username }],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ApiError(StatusCodes.CONFLICT, "Email or username already in use");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        wallet: {
          create: {},
        },
      },
      select: publicUserSelect,
    });

    const tokens = await this.issueTokens(user.id, user.username);
    return { user, ...tokens };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        ...publicUserSelect,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }

    assertAccountIsActive(user);

    const isValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid credentials");
    }

    const { passwordHash, ...safeUser } = user;
    const tokens = await this.issueTokens(safeUser.id, safeUser.username);
    return { user: safeUser, ...tokens };
  },

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);

    if (payload.tokenType !== "refresh") {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid refresh token");
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      select: {
        userId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token expired");
    }

    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        suspendedAt: true,
        bannedAt: true,
      },
    });

    assertAccountIsActive(user);

    return this.issueTokens(user.id, user.username);
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async issueTokens(userId: string, username: string) {
    const accessToken = signAccessToken({
      sub: userId,
      username,
      tokenType: "access",
      tokenId: randomUUID(),
    });
    const refreshToken = signRefreshToken({
      sub: userId,
      username,
      tokenType: "refresh",
      tokenId: randomUUID(),
    });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  },
};
