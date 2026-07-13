FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile && pnpm turbo run build --filter=@amazon-profit/worker...
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
CMD ["node","apps/worker/dist/main.js"]
