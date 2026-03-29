import assert from "node:assert/strict";
import test, { after } from "node:test";
import { api, authHeader, cleanupUsers, registerUser } from "./helpers/test-helpers.js";

const userIds: string[] = [];

after(async () => {
  await cleanupUsers(userIds);
});

test("voice rooms enforce privacy rules for followers, friends, and invite-only rooms", async () => {
  const owner = await registerUser("voice-owner");
  const follower = await registerUser("voice-follower");
  const friend = await registerUser("voice-friend");
  const stranger = await registerUser("voice-stranger");
  userIds.push(owner.user.id, follower.user.id, friend.user.id, stranger.user.id);

  const followersRoom = await api
    .post("/api/voice-rooms")
    .set(authHeader(owner.accessToken))
    .send({
      title: "Followers room",
      privacy: "FOLLOWERS",
    })
    .expect(201);

  await api
    .get(`/api/voice-rooms/${followersRoom.body.id}`)
    .set(authHeader(stranger.accessToken))
    .expect(403);

  await api
    .post(`/api/users/${owner.user.id}/follow`)
    .set(authHeader(follower.accessToken))
    .expect(200);

  await api
    .get(`/api/voice-rooms/${followersRoom.body.id}`)
    .set(authHeader(follower.accessToken))
    .expect(200);

  const friendsRoom = await api
    .post("/api/voice-rooms")
    .set(authHeader(owner.accessToken))
    .send({
      title: "Friends room",
      privacy: "FRIENDS",
    })
    .expect(201);

  const friendRequest = await api
    .post(`/api/social/friends/${owner.user.id}/request`)
    .set(authHeader(friend.accessToken))
    .expect(201);

  await api
    .post(`/api/social/friend-requests/${friendRequest.body.id}/respond`)
    .set(authHeader(owner.accessToken))
    .send({ action: "accept" })
    .expect(200);

  await api
    .get(`/api/voice-rooms/${friendsRoom.body.id}`)
    .set(authHeader(friend.accessToken))
    .expect(200);

  const inviteOnlyRoom = await api
    .post("/api/voice-rooms")
    .set(authHeader(owner.accessToken))
    .send({
      title: "Invite only room",
      privacy: "INVITE_ONLY",
    })
    .expect(201);

  await api
    .get(`/api/voice-rooms/${inviteOnlyRoom.body.id}`)
    .set(authHeader(follower.accessToken))
    .expect(403);
});

test("voice rooms enforce owner and admin moderation rules server-side", async () => {
  const owner = await registerUser("voice-mod-owner");
  const admin = await registerUser("voice-mod-admin");
  const member = await registerUser("voice-mod-member");
  userIds.push(owner.user.id, admin.user.id, member.user.id);

  const room = await api
    .post("/api/voice-rooms")
    .set(authHeader(owner.accessToken))
    .send({
      title: "Moderated room",
      description: "Real-time moderation rules",
      privacy: "PUBLIC",
    })
    .expect(201);

  await api
    .post(`/api/voice-rooms/${room.body.id}/join`)
    .set(authHeader(admin.accessToken))
    .expect(200);

  await api
    .post(`/api/voice-rooms/${room.body.id}/join`)
    .set(authHeader(member.accessToken))
    .expect(200);

  await api
    .post(`/api/voice-rooms/${room.body.id}/participants/${admin.user.id}/role`)
    .set(authHeader(owner.accessToken))
    .send({ role: "ADMIN" })
    .expect(200);

  await api
    .post(`/api/voice-rooms/${room.body.id}/participants/${member.user.id}/moderation`)
    .set(authHeader(admin.accessToken))
    .send({ muted: true })
    .expect(200)
    .then((response) => {
      assert.equal(response.body.isMutedByModerator, true);
      assert.equal(response.body.state, "MUTED");
    });

  await api
    .post(`/api/voice-rooms/${room.body.id}/state`)
    .set(authHeader(member.accessToken))
    .send({ state: "SPEAKING" })
    .expect(403);

  await api
    .post(`/api/voice-rooms/${room.body.id}/participants/${member.user.id}/moderation`)
    .set(authHeader(admin.accessToken))
    .send({ muted: false })
    .expect(200)
    .then((response) => {
      assert.equal(response.body.isMutedByModerator, false);
      assert.equal(response.body.state, "LISTENING");
    });

  await api
    .post(`/api/voice-rooms/${room.body.id}/participants/${owner.user.id}/moderation`)
    .set(authHeader(admin.accessToken))
    .send({ muted: true })
    .expect(403);

  await api
    .delete(`/api/voice-rooms/${room.body.id}/participants/${member.user.id}`)
    .set(authHeader(admin.accessToken))
    .expect(200);

  await api
    .post(`/api/voice-rooms/${room.body.id}/end`)
    .set(authHeader(owner.accessToken))
    .expect(200)
    .then((response) => {
      assert.equal(response.body.status, "ENDED");
      assert.equal(response.body.canJoin, false);
    });
});
