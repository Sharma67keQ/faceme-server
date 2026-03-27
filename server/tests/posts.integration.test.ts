import assert from "node:assert/strict";
import test, { after } from "node:test";
import { api, authHeader, cleanupUsers, registerUser } from "./helpers/test-helpers.js";

const userIds: string[] = [];

after(async () => {
  await cleanupUsers(userIds);
});

test("posts flow supports create, feed, comment, and save", async () => {
  const author = await registerUser("posts-author");
  const viewer = await registerUser("posts-viewer");
  userIds.push(author.user.id, viewer.user.id);

  const createPostResponse = await api
    .post("/api/posts")
    .set(authHeader(author.accessToken))
    .send({
      body: "Production readiness post",
      kind: "STANDARD",
    })
    .expect(201);

  assert.equal(createPostResponse.body.body, "Production readiness post");

  const commentResponse = await api
    .post(`/api/posts/${createPostResponse.body.id}/comments`)
    .set(authHeader(viewer.accessToken))
    .send({
      body: "Looks stable",
    })
    .expect(201);

  assert.equal(commentResponse.body.body, "Looks stable");

  const saveResponse = await api
    .post(`/api/posts/${createPostResponse.body.id}/save`)
    .set(authHeader(viewer.accessToken))
    .expect(200);

  assert.equal(saveResponse.body.isSaved, true);

  const feedResponse = await api
    .get("/api/posts/feed")
    .set(authHeader(author.accessToken))
    .expect(200);

  assert.ok(Array.isArray(feedResponse.body));
  assert.ok(feedResponse.body.some((post: { id: string }) => post.id === createPostResponse.body.id));
});

test("post owners can edit and delete their own posts and comments", async () => {
  const author = await registerUser("posts-owner");
  const viewer = await registerUser("posts-owner-viewer");
  userIds.push(author.user.id, viewer.user.id);

  const createPostResponse = await api
    .post("/api/posts")
    .set(authHeader(author.accessToken))
    .send({
      body: "Original post body",
      kind: "STANDARD",
    })
    .expect(201);

  const commentResponse = await api
    .post(`/api/posts/${createPostResponse.body.id}/comments`)
    .set(authHeader(author.accessToken))
    .send({
      body: "Original comment body",
    })
    .expect(201);

  const updatePostResponse = await api
    .patch(`/api/posts/${createPostResponse.body.id}`)
    .set(authHeader(author.accessToken))
    .send({
      body: "Updated post body",
      mediaUrl: null,
    })
    .expect(200);

  assert.equal(updatePostResponse.body.body, "Updated post body");

  const updateCommentResponse = await api
    .patch(`/api/posts/comments/${commentResponse.body.id}`)
    .set(authHeader(author.accessToken))
    .send({
      body: "Updated comment body",
    })
    .expect(200);

  assert.equal(updateCommentResponse.body.body, "Updated comment body");

  await api
    .delete(`/api/posts/comments/${commentResponse.body.id}`)
    .set(authHeader(author.accessToken))
    .expect(200);

  await api
    .delete(`/api/posts/${createPostResponse.body.id}`)
    .set(authHeader(author.accessToken))
    .expect(200);

  const feedResponse = await api
    .get("/api/posts/feed")
    .set(authHeader(viewer.accessToken))
    .expect(200);

  assert.ok(!feedResponse.body.some((post: { id: string }) => post.id === createPostResponse.body.id));
});
