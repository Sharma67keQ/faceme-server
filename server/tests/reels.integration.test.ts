import assert from "node:assert/strict";
import test, { after } from "node:test";
import { api, authHeader, cleanupUsers, registerUser } from "./helpers/test-helpers.js";

const userIds: string[] = [];

after(async () => {
  await cleanupUsers(userIds);
});

test("reels flow supports create, like, comment, and share", async () => {
  const author = await registerUser("reels-author");
  const viewer = await registerUser("reels-viewer");
  userIds.push(author.user.id, viewer.user.id);

  const createReelResponse = await api
    .post("/api/reels")
    .set(authHeader(author.accessToken))
    .send({
      videoUrl: "https://example.com/reel.mp4",
      caption: "Launch reel",
    })
    .expect(201);

  assert.equal(createReelResponse.body.caption, "Launch reel");

  const likeResponse = await api
    .post(`/api/reels/${createReelResponse.body.id}/like`)
    .set(authHeader(viewer.accessToken))
    .expect(200);

  assert.equal(likeResponse.body.isLiked, true);

  const commentResponse = await api
    .post(`/api/reels/${createReelResponse.body.id}/comments`)
    .set(authHeader(viewer.accessToken))
    .send({
      body: "This reel is strong",
    })
    .expect(201);

  assert.equal(commentResponse.body.body, "This reel is strong");

  const shareResponse = await api
    .post(`/api/reels/${createReelResponse.body.id}/share`)
    .set(authHeader(viewer.accessToken))
    .expect(200);

  assert.equal(shareResponse.body.shared, true);
  assert.ok(shareResponse.body.shareSlug);

  const reelsResponse = await api
    .get("/api/reels")
    .set(authHeader(viewer.accessToken))
    .expect(200);

  const reel = reelsResponse.body.find((item: { id: string }) => item.id === createReelResponse.body.id);
  assert.ok(reel);
  assert.equal(reel.commentsCount, 1);
});
