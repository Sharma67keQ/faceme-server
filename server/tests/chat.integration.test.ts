import assert from "node:assert/strict";
import test, { after } from "node:test";
import { api, authHeader, cleanupUsers, registerUser } from "./helpers/test-helpers.js";

const userIds: string[] = [];

after(async () => {
  await cleanupUsers(userIds);
});

test("chat flow supports direct conversation and messaging", async () => {
  const sender = await registerUser("chat-sender");
  const recipient = await registerUser("chat-recipient");
  userIds.push(sender.user.id, recipient.user.id);

  const conversationResponse = await api
    .post("/api/chat/conversations/direct")
    .set(authHeader(sender.accessToken))
    .send({
      peerId: recipient.user.id,
    })
    .expect(201);

  assert.ok(conversationResponse.body.id);

  const messageResponse = await api
    .post(`/api/chat/conversations/${conversationResponse.body.id}/messages`)
    .set(authHeader(sender.accessToken))
    .send({
      text: "Launch hardening message",
      type: "TEXT",
    })
    .expect(201);

  assert.equal(messageResponse.body.text, "Launch hardening message");

  const messagesResponse = await api
    .get(`/api/chat/conversations/${conversationResponse.body.id}/messages`)
    .set(authHeader(recipient.accessToken))
    .expect(200);

  assert.ok(Array.isArray(messagesResponse.body));
  assert.ok(messagesResponse.body.some((message: { id: string }) => message.id === messageResponse.body.id));
});

test("chat conversations expose unread counts and clear them when opened", async () => {
  const sender = await registerUser("chat-unread-sender");
  const recipient = await registerUser("chat-unread-recipient");
  userIds.push(sender.user.id, recipient.user.id);

  const conversationResponse = await api
    .post("/api/chat/conversations/direct")
    .set(authHeader(sender.accessToken))
    .send({
      peerId: recipient.user.id,
    })
    .expect(201);

  await api
    .post(`/api/chat/conversations/${conversationResponse.body.id}/messages`)
    .set(authHeader(sender.accessToken))
    .send({
      text: "Unread message one",
      type: "TEXT",
    })
    .expect(201);

  await api
    .post(`/api/chat/conversations/${conversationResponse.body.id}/messages`)
    .set(authHeader(sender.accessToken))
    .send({
      text: "Unread message two",
      type: "TEXT",
    })
    .expect(201);

  const unreadListResponse = await api
    .get("/api/chat/conversations")
    .set(authHeader(recipient.accessToken))
    .expect(200);

  const unreadConversation = unreadListResponse.body.find(
    (conversation: { id: string }) => conversation.id === conversationResponse.body.id,
  );

  assert.equal(unreadConversation.unreadCount, 2);

  await api
    .get(`/api/chat/conversations/${conversationResponse.body.id}/messages`)
    .set(authHeader(recipient.accessToken))
    .expect(200);

  const clearedListResponse = await api
    .get("/api/chat/conversations")
    .set(authHeader(recipient.accessToken))
    .expect(200);

  const clearedConversation = clearedListResponse.body.find(
    (conversation: { id: string }) => conversation.id === conversationResponse.body.id,
  );

  assert.equal(clearedConversation.unreadCount, 0);
});
