import assert from "node:assert/strict";
import test, { after } from "node:test";
import { api, authHeader, cleanupUsers, registerUser } from "./helpers/test-helpers.js";

const userIds: string[] = [];

after(async () => {
  await cleanupUsers(userIds);
});

test("profile visibility supports public, followers, and friends access rules with friend counts", async () => {
  const owner = await registerUser("profile-owner");
  const follower = await registerUser("profile-follower");
  const friend = await registerUser("profile-friend");
  userIds.push(owner.user.id, follower.user.id, friend.user.id);

  await api
    .post("/api/posts")
    .set(authHeader(owner.accessToken))
    .send({
      body: "Owner visibility test post",
      kind: "STANDARD",
    })
    .expect(201);

  await api
    .patch("/api/users/me")
    .set(authHeader(owner.accessToken))
    .send({
      profileVisibility: "FOLLOWERS",
    })
    .expect(200);

  await api
    .get(`/api/users/${owner.user.username}/posts`)
    .set(authHeader(follower.accessToken))
    .expect(200)
    .then((response) => {
      assert.equal(response.body.length, 0);
    });

  await api
    .post(`/api/users/${owner.user.id}/follow`)
    .set(authHeader(follower.accessToken))
    .expect(200);

  await api
    .get(`/api/users/${owner.user.username}/posts`)
    .set(authHeader(follower.accessToken))
    .expect(200)
    .then((response) => {
      assert.equal(response.body.length, 1);
    });

  await api
    .patch("/api/users/me")
    .set(authHeader(owner.accessToken))
    .send({
      profileVisibility: "FRIENDS",
    })
    .expect(200);

  await api
    .get(`/api/users/${owner.user.username}/posts`)
    .set(authHeader(follower.accessToken))
    .expect(200)
    .then((response) => {
      assert.equal(response.body.length, 0);
    });

  const friendRequest = await api
    .post(`/api/social/friends/${owner.user.id}/request`)
    .set(authHeader(friend.accessToken))
    .expect(201);

  await api
    .post(`/api/social/friend-requests/${friendRequest.body.id}/respond`)
    .set(authHeader(owner.accessToken))
    .send({
      action: "accept",
    })
    .expect(200);

  const friendPostsResponse = await api
    .get(`/api/users/${owner.user.username}/posts`)
    .set(authHeader(friend.accessToken))
    .expect(200);

  assert.equal(friendPostsResponse.body.length, 1);

  const ownerProfileResponse = await api
    .get("/api/users/me")
    .set(authHeader(owner.accessToken))
    .expect(200);

  assert.equal(ownerProfileResponse.body.profileVisibility, "FRIENDS");
  assert.equal(ownerProfileResponse.body.friendCount, 1);
});
