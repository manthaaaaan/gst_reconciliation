# ==============================================================================
# 1. Base Stage: Node 20 Alpine base with libc compatibility
# ==============================================================================
FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat
WORKDIR /app

# ==============================================================================
# 2. Dependencies Stage: Install dependencies
# ==============================================================================
FROM base AS deps

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

RUN \
  if [ -f package-lock.json ]; then npm ci --ignore-scripts; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else npm install; \
  fi

# ==============================================================================
# 3. Build Stage: Compile and optimize frontend application
# ==============================================================================
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ==============================================================================
# 4. Production Runner Stage: Minimal footprint & non-root user
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME="0.0.0.0" \
    NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./ 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:3000/ || exit 1

CMD ["sh", "-c", "if [ -f server.js ]; then node server.js; else npm start -- --port 3000 --host 0.0.0.0; fi"]
