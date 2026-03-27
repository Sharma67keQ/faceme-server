import { Router } from "express";
import { socialController } from "../controllers/social.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const socialRouter = Router();

socialRouter.use(requireAuth);

socialRouter.get("/friends", asyncHandler(socialController.friends));
socialRouter.get("/friend-requests", asyncHandler(socialController.friendRequests));
socialRouter.post("/friends/:userId/request", asyncHandler(socialController.sendFriendRequest));
socialRouter.post("/friend-requests/:requestId/respond", asyncHandler(socialController.respondToFriendRequest));
socialRouter.delete("/friends/:userId", asyncHandler(socialController.removeFriend));
socialRouter.get("/relationship/:userId", asyncHandler(socialController.relationship));
socialRouter.get("/people-you-may-know", asyncHandler(socialController.peopleYouMayKnow));

socialRouter.get("/pages", asyncHandler(socialController.pages));
socialRouter.get("/pages/:slug", asyncHandler(socialController.page));
socialRouter.post("/pages", asyncHandler(socialController.createPage));
socialRouter.post("/pages/:pageId/follow", asyncHandler(socialController.togglePageFollow));
socialRouter.patch("/pages/:pageId", asyncHandler(socialController.updatePage));
socialRouter.delete("/pages/:pageId", asyncHandler(socialController.deletePage));

socialRouter.get("/groups", asyncHandler(socialController.groups));
socialRouter.get("/groups/:slug", asyncHandler(socialController.group));
socialRouter.post("/groups", asyncHandler(socialController.createGroup));
socialRouter.post("/groups/:groupId/join", asyncHandler(socialController.joinGroup));
socialRouter.patch("/groups/:groupId", asyncHandler(socialController.updateGroup));
socialRouter.delete("/groups/:groupId", asyncHandler(socialController.deleteGroup));

socialRouter.get("/launch", asyncHandler(socialController.launch));
socialRouter.get("/explore", asyncHandler(socialController.explore));
socialRouter.post("/invites", asyncHandler(socialController.createInvite));
socialRouter.post("/invites/:code/redeem", asyncHandler(socialController.redeemInvite));
socialRouter.post("/feedback", asyncHandler(socialController.createFeedback));
