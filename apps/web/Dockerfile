FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/api-client/package.json ./packages/api-client/
RUN pnpm install --frozen-lockfile || pnpm install
COPY packages/shared-types ./packages/shared-types
COPY packages/api-client ./packages/api-client
COPY apps/web ./apps/web
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @timefairy/shared-types build
RUN pnpm --filter @timefairy/api-client build
RUN pnpm --filter @timefairy/web build

FROM nginx:alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
