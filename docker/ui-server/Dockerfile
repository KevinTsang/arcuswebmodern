# Builds the static export and serves it with nginx. A drop-in replacement for
# the legacy arcusweb ui-server image: same base, port, ARCUS_* environment
# and writable config directory, so deployments only need the new image.
#
# Build from the repository root:
#   docker build -f docker/ui-server/Dockerfile .

FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/arcus-core/package.json packages/arcus-core/
RUN CYPRESS_INSTALL_BINARY=0 npm ci

# Platform URLs are deliberately not baked in: run-nginx writes them to
# server.json from ARCUS_* when the container starts. The client version, sent
# to the platform as X-Client-Version, is fixed per build: docker/bin/build.sh
# passes the image tag, and without it next.config.ts uses package.json's.
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build

FROM nginx:1.30-trixie

RUN rm /etc/nginx/conf.d/default.conf

COPY docker/ui-server/run-nginx /usr/bin
RUN chmod +x /usr/bin/run-nginx
RUN mkdir /usr/share/nginx/html/.well-known

COPY docker/ui-server/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html

# Run as the non-root user arcus-k8s runs it as (uid and gid 1000), so the image
# isn't root anywhere else either. That user owns only what nginx and run-nginx
# write: the cache, the pid file's directory and server.json's directory, which
# arcus-k8s mounts as writable volumes over its read-only root filesystem. The
# app's files stay root-owned, so nginx can't change them.
RUN mkdir -p /usr/share/nginx/html/build/dist/config \
 && chown -R 1000:1000 /var/cache/nginx /run /usr/share/nginx/html/build/dist/config
USER 1000:1000

EXPOSE 8096
CMD [ "/usr/bin/run-nginx" ]
