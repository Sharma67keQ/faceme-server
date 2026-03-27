import assert from "node:assert/strict";
import test, { after } from "node:test";
import { cleanupUsers, registerUser, api } from "./helpers/test-helpers.js";

const userIds: string[] = [];

after(async () => {
  await cleanupUsers(userIds);
});

test("auth register, login, refresh, and logout flow works", async () => {
  const registered = await registerUser("auth");
  userIds.push(registered.user.id);

  const loginResponse = await api
    .post("/api/auth/login")
    .send({
      email: registered.credentials.email,
      password: registered.credentials.password,
    })
    .expect(200);

  assert.ok(loginResponse.body.accessToken);
  assert.ok(loginResponse.body.refreshToken);

  const refreshResponse = await api
    .post("/api/auth/refresh")
    .send({ refreshToken: loginResponse.body.refreshToken })
    .expect(200);

  assert.ok(refreshResponse.body.accessToken);
  assert.ok(refreshResponse.body.refreshToken);
  assert.notEqual(refreshResponse.body.refreshToken, loginResponse.body.refreshToken);

  await api
    .post("/api/auth/logout")
    .send({ refreshToken: refreshResponse.body.refreshToken })
    .expect(200);

  await api
    .post("/api/auth/refresh")
    .send({ refreshToken: refreshResponse.body.refreshToken })
    .expect(401);
});
