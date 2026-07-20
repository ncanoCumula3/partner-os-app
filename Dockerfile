# ---- build stage: install deps + build the client ----
FROM node:20-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile=false
COPY . .
RUN pnpm build

# ---- runtime: serve SPA + custom API via tsx ----
FROM node:20-slim
WORKDIR /app
RUN corepack enable
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
