FROM node:22-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/arcus-core/package.json packages/arcus-core/
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the browser bundle at build time,
# so they MUST be present here — runtime -e flags do not affect client code.
ARG NEXT_PUBLIC_API_URL=https://client.dev.myDevUrl.com
ARG NEXT_PUBLIC_WS_URL=wss://client.dev.myDevUrl.com
ARG NEXT_PUBLIC_REDIRECT_URL=https://client.dev.myDevUrl.com
ARG NEXT_PUBLIC_APP_VERSION=2018.10.2
ARG NEXT_PUBLIC_IOS_DOWNLOAD_URL=https://itunes.apple.com
ARG NEXT_PUBLIC_ANDROID_DOWNLOAD_URL=https://play.google.com/store/apps
ARG NEXT_PUBLIC_ENABLE_YEARLY_SUBSCRIPTION=1
ARG NEXT_PUBLIC_ENABLE_HUB_WIFI_SCAN=1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_REDIRECT_URL=$NEXT_PUBLIC_REDIRECT_URL \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION \
    NEXT_PUBLIC_IOS_DOWNLOAD_URL=$NEXT_PUBLIC_IOS_DOWNLOAD_URL \
    NEXT_PUBLIC_ANDROID_DOWNLOAD_URL=$NEXT_PUBLIC_ANDROID_DOWNLOAD_URL \
    NEXT_PUBLIC_ENABLE_YEARLY_SUBSCRIPTION=$NEXT_PUBLIC_ENABLE_YEARLY_SUBSCRIPTION \
    NEXT_PUBLIC_ENABLE_HUB_WIFI_SCAN=$NEXT_PUBLIC_ENABLE_HUB_WIFI_SCAN

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
