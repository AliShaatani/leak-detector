# ─── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

# System libs for canvas (native module) + openssl for Prisma
RUN apk add --no-cache \
    libc6-compat openssl \
    python3 make g++ \
    cairo-dev pango-dev \
    jpeg-dev giflib-dev \
    librsvg-dev

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache \
    openssl \
    cairo-dev pango-dev \
    jpeg-dev giflib-dev \
    librsvg-dev

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client - requires DATABASE_URL to be defined even if not used
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npm run build

# ─── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Runtime libs
RUN apk add --no-cache \
    openssl \
    cairo pango \
    libjpeg-turbo giflib \
    librsvg

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy built standalone server
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

# Copy Prisma for migrations
COPY --from=builder /app/prisma           ./prisma
COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/docker-seed.js   ./docker-seed.js

# Ensure uploads folder exists and is writable
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public ./public/uploads

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Startup: migrate → seed → start
# We use 'npx prisma migrate deploy' which requires the prisma CLI in node_modules
CMD ["sh", "-c", "npx prisma migrate deploy && node docker-seed.js && node server.js"]
