# Faceme Hybrid Social Platform

## Core architecture

Faceme is implemented as a React Native Expo client backed by an Express API, Prisma ORM, PostgreSQL persistence, Socket.IO realtime messaging, and JWT-based authentication. The product is structured as one hybrid social platform with multiple content modes on the same graph:

- relationship-driven social posts
- visual feed and discovery
- fast conversational quick posts
- short-form reels
- 24-hour status updates
- live voice rooms

The app keeps a single user identity, a single messaging layer, and a single notification system across friends, follows, pages, groups, and chats.

## Backend modules

- `server/src/routes/auth.routes.ts`: auth and token lifecycle
- `server/src/routes/user.routes.ts`: profile, follow, block, report, public user views
- `server/src/routes/post.routes.ts`: feed, explore posts, comments, reactions, save, share
- `server/src/routes/status.routes.ts`: 24-hour status updates, views, replies, emoji reactions
- `server/src/routes/reel.routes.ts`: short video publishing and engagement
- `server/src/routes/voice-room.routes.ts`: live voice room lifecycle
- `server/src/routes/chat.routes.ts`: direct and group messaging APIs
- `server/src/routes/community.routes.ts`: legacy community support
- `server/src/routes/social.routes.ts`: friends, pages, groups, onboarding, invites, feedback, discovery
- `server/src/services/*.service.ts`: business logic by domain
- `server/src/sockets/chat.socket.ts`: realtime message delivery, typing, seen updates

Controllers stay thin. Validation happens at the route boundary with `zod`. Services own permission checks, graph logic, notifications, and feed/discovery ranking.

## Mobile modules

- `mobile/app/(tabs)/index.tsx`: upgraded feed with launch controls, onboarding, friend requests, page and group suggestions
- `mobile/app/explore.tsx`: trending posts, active discussions, suggested users/pages/groups
- `mobile/app/status.tsx`: WhatsApp/Facebook-style 24-hour status flow
- `mobile/app/reels.tsx`: short-video feed
- `mobile/app/voice-rooms.tsx`: IMO-style voice room listing and creation
- `mobile/app/profile/[username].tsx`: follow, friend, message, mutual-friend profile loop
- `mobile/services/social.ts`: mobile API wrapper for the new social graph endpoints
- `mobile/services/posts.ts`, `mobile/services/chat.ts`, `mobile/services/users.ts`: existing content and messaging clients
- `mobile/types/domain.ts`: shared domain contracts for posts, relationships, pages, groups, launch data, and explore data

## Database schema

The expanded Prisma schema now includes:

- `User`
- `Profile`
- `FriendRequest`
- `Friendship`
- `Page`
- `PageFollower`
- `Group`
- `GroupMember`
- `Status`
- `StatusView`
- `StatusReaction`
- `Reel`
- `ReelLike`
- `VoiceRoom`
- `VoiceParticipant`
- `Conversation` and `ConversationParticipant` as the active chat layer
- `Message`
- `MessageStatus`
- `Post`
- `PostComment`
- `CommentReaction`
- `PostLike`
- `Notification`
- `FeatureFlag`
- `BetaAccess`
- `ProductFeedback`
- `Invite`
- `InviteRedemption`

Existing models for follows, stories, saved posts, moderation, refresh tokens, and communities remain in place.

## Friend system logic

- Friend requests are created through `FriendRequest` with `PENDING`, `ACCEPTED`, `REJECTED`, or `CANCELED`.
- Accepting a request creates mirrored `Friendship` rows so friend lookups stay fast.
- Relationship lookup returns:
  - `isFriend`
  - `hasSentRequest`
  - `hasIncomingRequest`
  - `mutualFriendsCount`
  - mutual-friend previews
- Notifications are emitted for new requests and accepted requests.
- Profile actions use this relationship state to drive `Add friend`, `Accept friend`, or `Friends`.

## Privacy system

Post and status visibility use first-class visibility rules:

- `PUBLIC`
- `FOLLOWERS`
- `FRIENDS`

The backend enforces access before content is listed or viewed:

- public content is visible to everyone with access to the app
- follower content requires an actual follow edge
- friend content requires an actual friendship edge
- private-group post access additionally requires active group membership

This is enforced in service-layer queries, not only in the mobile UI.

## Group system logic

- Groups are stored in `Group` with `PUBLIC` or `PRIVATE` privacy.
- Membership state is stored in `GroupMember`.
- Group creation also creates a dedicated group conversation for basic group chat.
- Public groups join immediately with `ACTIVE`.
- Private groups enter `PENDING`, which is future-ready for approval workflows.
- Group discovery surfaces member count, discussion volume, and chat linkage.

## Messaging system

- Direct chat uses `Conversation` with type `DIRECT`.
- Multi-user chat uses `Conversation` with type `GROUP`.
- Community-linked and group-linked realtime chat are future-ready on the same transport.
- Messages support text, image, video, and audio media typing in schema.
- `MessageStatus` tracks sent, delivered, and seen state per recipient.
- Socket.IO already supports:
  - join room
  - send message
  - typing indicators
  - seen updates

Message payloads now support:

- text
- image URL
- video URL
- audio / voice-message URL
- reply linkage

The same conversation layer is positioned to support call signaling later without replacing the current chat model.

## Feed and explore logic

Feed ranking now blends:

- the user’s own posts
- friends’ posts
- followed-account posts
- followed-page posts
- active discussions
- freshness
- prior interaction signals
- quick-post boost for lightweight conversation content

Explore returns:

- trending posts
- active discussions
- suggested users
- suggested pages
- suggested groups

Posts now carry richer context:

- `kind`: `STANDARD`, `QUICK`, or `SHARE`
- optional page context
- optional group context
- `discussionLabel`
- `scoreReason`
- `shareSlug` for deep-link/share routing

## Status system

Status uses dedicated `Status`, `StatusView`, and `StatusReaction` models.

- users can publish text, image, or video status
- status expires automatically after 24 hours
- viewers can react with emoji or short reply text
- the owner can see viewer count and reaction activity
- status visibility follows the same public/followers/friends backend rules as posts

## Reels system

Reels uses dedicated `Reel` and `ReelLike` models.

- each reel is a short-form vertical video record
- explore/feed can surface recommended or trending reels
- users can publish reels and like them
- reels keep creator identity attached to the same follow/friend/profile graph

## Voice room system

Voice rooms use `VoiceRoom` and `VoiceParticipant`.

- a host creates a live room
- participants join as listeners
- participant state tracks listening, speaking, or muted
- room activity generates meaningful notifications
- the schema is future-ready for video-room expansion without replacing the voice-room model

## Launch, onboarding, and growth loop

Launch-ready features added to the product:

- feature flags through `FeatureFlag`
- beta-user segmentation through `BetaAccess`
- in-app feedback capture through `ProductFeedback`
- invite generation and redemption through `Invite` and `InviteRedemption`

Onboarding improves retention by immediately returning:

- suggested users
- suggested pages
- suggested groups
- pending friend-request context

This reduces empty-feed risk and gives the user an immediate path to follow, friend, join, message, and reply.

## Viral and growth loop

The viral loop works like this:

1. User creates content or joins a discussion.
2. Reactions/comments/friend activity trigger meaningful notifications.
3. The feed highlights active discussion and recent reply momentum.
4. Users create invite links with `Join me on Faceme`.
5. Shared posts and invite links route new users back into signup and onboarding.
6. Onboarding seeds users, pages, and groups so the new user quickly enters the same loop.

The growth loop works like this:

1. Discovery surfaces people, pages, groups, and hot threads.
2. Profiles expose follow, friend, and message actions.
3. Group and page membership expand the feed graph.
4. Notifications pull users back only for meaningful social events.
5. Invite redemption and feedback collection support staged rollout and iteration without fake engagement.

## Product identity

Faceme is not implemented as a clone:

- unlike Facebook, the feed is lighter and discussion-led rather than dense and utility-heavy
- unlike Instagram, discovery is not purely visual and keeps pages, groups, and conversations first-class
- unlike Twitter/X, quick posts sit inside a broader relationship and community system instead of replacing it

The result is one hybrid platform centered on identity, discussion, media, and social belonging.
