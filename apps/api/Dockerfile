FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api
RUN pnpm --filter @timefairy/shared-types build
RUN pnpm --filter @timefairy/api exec prisma generate
RUN pnpm --filter @timefairy/api build
RUN cd /app/apps/api && pnpm exec tsc prisma/seed.ts \
  --esModuleInterop \
  --module commonjs \
  --target ES2022 \
  --outDir prisma \
  --skipLibCheck
RUN pnpm --filter @timefairy/api deploy --prod --legacy /deploy \
  && rm -f /deploy/prisma.config.ts \
  && cd /deploy && ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl wget
WORKDIR /app
COPY --from=build /deploy ./apps/api
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY apps/api/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["/docker-entrypoint.sh"]
