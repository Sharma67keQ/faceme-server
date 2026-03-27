import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { chatRouter } from "./chat.routes.js";
import { communityRouter } from "./community.routes.js";
import { moderationRouter } from "./moderation.routes.js";
import { mediaRouter } from "./media.routes.js";
import { notificationRouter } from "./notification.routes.js";
import { postRouter } from "./post.routes.js";
import { storyRouter } from "./story.routes.js";
import { socialRouter } from "./social.routes.js";
import { statusRouter } from "./status.routes.js";
import { userRouter } from "./user.routes.js";
import { reelRouter } from "./reel.routes.js";
import { voiceRoomRouter } from "./voice-room.routes.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "faceme-server" });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/posts", postRouter);
apiRouter.use("/chat", chatRouter);
apiRouter.use("/notifications", notificationRouter);
apiRouter.use("/media", mediaRouter);
apiRouter.use("/stories", storyRouter);
apiRouter.use("/communities", communityRouter);
apiRouter.use("/moderation", moderationRouter);
apiRouter.use("/social", socialRouter);
apiRouter.use("/status", statusRouter);
apiRouter.use("/reels", reelRouter);
apiRouter.use("/voice-rooms", voiceRoomRouter);
