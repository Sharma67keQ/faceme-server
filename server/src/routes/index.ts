import { adminRouter } from "./admin.route.js";
import { Router } from "express";
import { authRouter } from "./auth.route.js";
import { discoverRouter } from "./discover.route.js";
import { feedRouter } from "./feed.route.js";
import { healthRouter } from "./health.route.js";
import { inboxRouter } from "./inbox.route.js";
import { profileRouter } from "./profile.route.js";
import { reportRouter } from "./report.route.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/feed", feedRouter);
apiRouter.use("/discover", discoverRouter);
apiRouter.use("/inbox", inboxRouter);
apiRouter.use("/profile", profileRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/admin", adminRouter);
