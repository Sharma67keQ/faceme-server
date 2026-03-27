import assert from "node:assert/strict";
import test, { after } from "node:test";
import { prisma } from "../src/lib/prisma.js";
import { api, authHeader, cleanupUsers, registerUser } from "./helpers/test-helpers.js";

const userIds: string[] = [];

after(async () => {
  await cleanupUsers(userIds);
});

test("moderation flow enforces RBAC and allows admin report resolution with content removal", async () => {
  const admin = await registerUser("moderation-admin");
  const author = await registerUser("moderation-author");
  const reporter = await registerUser("moderation-reporter");
  userIds.push(admin.user.id, author.user.id, reporter.user.id);

  await prisma.user.update({
    where: { id: admin.user.id },
    data: { role: "ADMIN" },
  });

  const postResponse = await api
    .post("/api/posts")
    .set(authHeader(author.accessToken))
    .send({
      body: "This post will be reported and removed",
    })
    .expect(201);

  const reportResponse = await api
    .post(`/api/posts/${postResponse.body.id}/report`)
    .set(authHeader(reporter.accessToken))
    .send({
      reason: "Harmful misinformation",
    })
    .expect(201);

  await api
    .get("/api/moderation/reports")
    .set(authHeader(reporter.accessToken))
    .expect(403);

  const reportsResponse = await api
    .get("/api/moderation/reports")
    .set(authHeader(admin.accessToken))
    .expect(200);

  assert.ok(Array.isArray(reportsResponse.body));
  assert.ok(reportsResponse.body.some((report: { id: string }) => report.id === reportResponse.body.id));

  await api
    .post(`/api/moderation/posts/${postResponse.body.id}/action`)
    .set(authHeader(admin.accessToken))
    .send({
      action: "remove",
      reason: "Confirmed harmful content",
      reportId: reportResponse.body.id,
    })
    .expect(200);

  const updatedReportResponse = await api
    .get("/api/moderation/reports")
    .set(authHeader(admin.accessToken))
    .expect(200);

  const moderatedReport = updatedReportResponse.body.find((report: { id: string }) => report.id === reportResponse.body.id);
  assert.equal(moderatedReport.status, "RESOLVED");

  const reporterFeedResponse = await api
    .get("/api/posts/feed")
    .set(authHeader(reporter.accessToken))
    .expect(200);

  assert.ok(!reporterFeedResponse.body.some((post: { id: string }) => post.id === postResponse.body.id));
});
