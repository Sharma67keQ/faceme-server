FROM node:20-alpine AS deps
WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app/server

COPY --from=deps /app/server/node_modules ./node_modules
COPY server/package.json server/package-lock.json ./
COPY server/tsconfig.json ./tsconfig.json
COPY server/prisma ./prisma
COPY server/src ./src

RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app/server

ENV NODE_ENV=production

COPY --from=deps /app/server/node_modules ./node_modules
COPY --from=build /app/server/dist ./dist
COPY --from=build /app/server/prisma ./prisma
COPY --from=build /app/server/package.json ./package.json
COPY server/scripts ./scripts

CMD ["npm", "run", "start:prod"]
