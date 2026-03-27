# Faceme

Faceme is a scalable social-chat platform built as a monorepo with:

- `mobile/`: React Native, Expo, TypeScript, Expo Router, Zustand, React Query
- `server/`: Node.js, Express, Socket.IO, PostgreSQL, Prisma, JWT

## Product roadmap built into the architecture

### V1

- Auth, onboarding, profiles
- Search users
- 1:1 realtime chat with text and image messages
- Feed, posts, likes, comments
- Basic notifications

### V2

- Stories
- Follow graph
- Saved posts and shared posts
- Typing indicators
- Delivered/seen states
- Block/report flows
- Explore and richer notifications

### V3

- Group chat
- Voice notes
- Calling architecture placeholders
- Communities
- Creator/business accounts
- Premium architecture
- Admin moderation
- Advanced media pipelines

## Structure

```txt
mobile/
server/
```

## Quick start

1. Copy `server/.env.example` to `server/.env`
2. Copy `mobile/.env.example` to `mobile/.env`
3. Start PostgreSQL with `npm run db:up`
4. Run `npm run db:setup`
5. Start server and Expo together with `npm run dev`

## Useful scripts

- `npm run dev`: starts the server and Expo together from the repo root
- `npm run dev:server`: starts only the API server
- `npm run dev:mobile`: starts only the Expo app
- `npm run db:setup`: generates Prisma client, runs migrations, and seeds the database
- `npm run db:up`: starts PostgreSQL from `docker-compose.yml`
- `npm run db:down`: stops the local PostgreSQL container

## Local development

- Root scripts are defined in `package.json`
- PostgreSQL runs from `docker-compose.yml`
- Seed data lives in `server/prisma/seed.ts`
- Schema lives in `server/prisma/schema.prisma`

## Notes

- Firebase is not used anywhere
- The schema intentionally includes future-ready tables so V2/V3 can be added without redesigning the data layer
