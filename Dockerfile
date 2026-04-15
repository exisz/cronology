# Stage 1: Build
FROM node:22-slim AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY . .

RUN pnpm build

# Stage 2: Production
FROM node:22-slim AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=18790
ENV HOST=0.0.0.0
ENV CRONOLOGY_DATA_DIR=/app/data

EXPOSE 18790

VOLUME /app/data

CMD ["node", "dist/server/index.js"]
