import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { postService } from "../services/post.service.js";
import { secureUrlSchema, trimmedString } from "../utils/validation.js";

const createPostSchema = z.object({
  body: trimmedString(1, 2000),
  mediaUrl: secureUrlSchema.optional(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).optional(),
  kind: z.enum(["STANDARD", "QUICK", "SHARE"]).optional(),
  pageId: z.string().min(1).optional(),
  groupId: z.string().min(1).optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "FRIENDS"]).optional(),
});

const updatePostSchema = z.object({
  body: trimmedString(1, 2000),
  mediaUrl: secureUrlSchema.nullable().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO"]).nullable().optional(),
  visibility: z.enum(["PUBLIC", "FOLLOWERS", "FRIENDS"]).optional(),
});

const commentSchema = z.object({
  body: trimmedString(1, 600),
  parentCommentId: z.string().min(1).optional(),
});

const updateCommentSchema = z.object({
  body: trimmedString(1, 600),
});

const commentReactionSchema = z
  .object({
    type: z.enum(["LIKE", "DISLIKE", "EMOJI"]),
    emoji: z.string().trim().min(1).max(16).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "EMOJI" && !value.emoji) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["emoji"],
        message: "Emoji is required for emoji reactions",
      });
    }
  });

const reportSchema = z.object({
  reason: trimmedString(3, 500),
});

export const postController = {
  async shared(req: Request, res: Response) {
    const shareSlug = z.string().min(1).parse(req.params.shareSlug);
    const post = await postService.getSharedPost(shareSlug, req.user?.id);
    return res.status(StatusCodes.OK).json(post);
  },

  async create(req: Request, res: Response) {
    const payload = createPostSchema.parse(req.body);
    const post = await postService.createPost(req.user!.id, payload);
    return res.status(StatusCodes.CREATED).json(post);
  },

  async feed(req: Request, res: Response) {
    const posts = await postService.getFeed(req.user!.id);
    return res.status(StatusCodes.OK).json(posts);
  },

  async explore(req: Request, res: Response) {
    const posts = await postService.getExplore(req.user!.id);
    return res.status(StatusCodes.OK).json(posts);
  },

  async byPage(req: Request, res: Response) {
    const pageId = z.string().min(1).parse(req.params.pageId);
    const posts = await postService.getPostsByPage(req.user!.id, pageId);
    return res.status(StatusCodes.OK).json(posts);
  },

  async byGroup(req: Request, res: Response) {
    const groupId = z.string().min(1).parse(req.params.groupId);
    const posts = await postService.getPostsByGroup(req.user!.id, groupId);
    return res.status(StatusCodes.OK).json(posts);
  },

  async like(req: Request, res: Response) {
    const postId = z.string().min(1).parse(req.params.postId);
    const like = await postService.likePost(req.user!.id, postId);
    return res.status(StatusCodes.OK).json(like);
  },

  async comment(req: Request, res: Response) {
    const postId = z.string().min(1).parse(req.params.postId);
    const payload = commentSchema.parse(req.body);
    const comment = await postService.commentOnPost(
      req.user!.id,
      postId,
      payload.body,
      payload.parentCommentId,
    );
    return res.status(StatusCodes.CREATED).json(comment);
  },

  async reactToComment(req: Request, res: Response) {
    const commentId = z.string().min(1).parse(req.params.commentId);
    const payload = commentReactionSchema.parse(req.body);
    const reaction = await postService.toggleCommentReaction(req.user!.id, commentId, payload);
    return res.status(StatusCodes.OK).json(reaction);
  },

  async saved(req: Request, res: Response) {
    const posts = await postService.getSavedPosts(req.user!.id);
    return res.status(StatusCodes.OK).json(posts);
  },

  async save(req: Request, res: Response) {
    const postId = z.string().min(1).parse(req.params.postId);
    const result = await postService.toggleSavedPost(req.user!.id, postId);
    return res.status(StatusCodes.OK).json(result);
  },

  async share(req: Request, res: Response) {
    const postId = z.string().min(1).parse(req.params.postId);
    const result = await postService.sharePost(req.user!.id, postId);
    return res.status(StatusCodes.CREATED).json(result);
  },

  async report(req: Request, res: Response) {
    const postId = z.string().min(1).parse(req.params.postId);
    const payload = reportSchema.parse(req.body);
    const report = await postService.reportPost(req.user!.id, postId, payload.reason);
    return res.status(StatusCodes.CREATED).json(report);
  },

  async reportComment(req: Request, res: Response) {
    const commentId = z.string().min(1).parse(req.params.commentId);
    const payload = reportSchema.parse(req.body);
    const report = await postService.reportComment(req.user!.id, commentId, payload.reason);
    return res.status(StatusCodes.CREATED).json(report);
  },

  async update(req: Request, res: Response) {
    const postId = z.string().min(1).parse(req.params.postId);
    const payload = updatePostSchema.parse(req.body);
    const post = await postService.updatePost(req.user!.id, postId, payload);
    return res.status(StatusCodes.OK).json(post);
  },

  async remove(req: Request, res: Response) {
    const postId = z.string().min(1).parse(req.params.postId);
    const result = await postService.deletePost(req.user!.id, postId);
    return res.status(StatusCodes.OK).json(result);
  },

  async updateComment(req: Request, res: Response) {
    const commentId = z.string().min(1).parse(req.params.commentId);
    const payload = updateCommentSchema.parse(req.body);
    const comment = await postService.updateComment(req.user!.id, commentId, payload.body);
    return res.status(StatusCodes.OK).json(comment);
  },

  async removeComment(req: Request, res: Response) {
    const commentId = z.string().min(1).parse(req.params.commentId);
    const result = await postService.deleteComment(req.user!.id, commentId);
    return res.status(StatusCodes.OK).json(result);
  },
};
