import assert from "node:assert/strict";
import request, { type SuperTest, type Test } from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

export const api: SuperTest<Test> = request(app);

export const createCredentials = (label: string) => {
  const stamp = `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    email: `${stamp}@example.com`,
    username: stamp.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 24),
    password: "Password123!",
    firstName: "Launch",
    lastName: "Tester",
  };
};

export const registerUser = async (label: string) => {
  const credentials = createCredentials(label);

  const response = await api.post("/api/auth/register").send(credentials).expect(201);

  assert.ok(response.body.user?.id);

  return {
    credentials,
    user: response.body.user,
    accessToken: response.body.accessToken as string,
    refreshToken: response.body.refreshToken as string,
  };
};

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const cleanupUsers = async (userIds: string[]) => {
  if (!userIds.length) {
    return;
  }

  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });
};
