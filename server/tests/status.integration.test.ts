import assert from "node:assert/strict";
import test, { after } from "node:test";
import { api, authHeader, cleanupUsers, registerUser } from "./helpers/test-helpers.js";

const userIds: string[] = [];

after(async () => {
  await cleanupUsers(userIds);
});

test("status flow supports create, list, react, and view", async () => {
  const author = await registerUser("status-author");
  const viewer = await registerUser("status-viewer");
  userIds.push(author.user.id, viewer.user.id);

  const statusResponse = await api
    .post("/api/status")
    .set(authHeader(author.accessToken))
    .send({
      kind: "TEXT",
      text: "Release check status",
      visibility: "PUBLIC",
    })
    .expect(201);

  assert.equal(statusResponse.body.text, "Release check status");

  const listResponse = await api
    .get("/api/status")
    .set(authHeader(viewer.accessToken))
    .expect(200);

  assert.ok(Array.isArray(listResponse.body));
  assert.ok(listResponse.body.some((status: { id: string }) => status.id === statusResponse.body.id));

  const reactResponse = await api
    .post(`/api/status/${statusResponse.body.id}/react`)
    .set(authHeader(viewer.accessToken))
    .send({
      emoji: "🔥",
      replyText: "Ready",
    })
    .expect(201);

  assert.equal(reactResponse.body.emoji, "🔥");

  const viewResponse = await api
    .post(`/api/status/${statusResponse.body.id}/view`)
    .set(authHeader(viewer.accessToken))
    .expect(200);

  assert.equal(viewResponse.body.statusId, statusResponse.body.id);
});
