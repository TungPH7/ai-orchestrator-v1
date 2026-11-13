# The app __APP__ of __TITLE__ for the deployer of the kit, built from the root of the repo, one pnpm workspace
# (project-scaffold part 2, spec 2.3). Caddy of the VPS keeps HTTPS, and basic auth on Development and Staging, in front
# of it. The deployer builds one image for each commit and runs it in all three environments, so nothing here may
# differ by environment: NEXT_PUBLIC_* values and the rewrites of next.config.ts are written into the build.
FROM node:24-bookworm-slim AS build

ENV NEXT_TELEMETRY_DISABLED=1 \
    # Corepack, which Node 24 ships, runs the pnpm that packageManager of package.json names, without asking.
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable pnpm

WORKDIR /app

# The packages of the lockfile first, so a change of code alone keeps this layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

# Every app is copied: one may import code another shares. --ignore-scripts: the root prepare script installs the Git
# hooks of the kit, which are not in the build context.
COPY apps/ apps/
RUN pnpm install --offline --frozen-lockfile --ignore-scripts
# public/ is optional in Next.js; the final stage copies it either way.
RUN mkdir -p apps/__APP__/public && pnpm --filter ./apps/__APP__ run build

FROM node:24-bookworm-slim

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    # Listen on every address of the container, not only on localhost.
    HOSTNAME=0.0.0.0 \
    PORT=__PORT__

WORKDIR /app

# The standalone server holds only the modules it uses. Owned by root: the node user reads the code but cannot change it.
COPY --from=build /app/apps/__APP__/.next/standalone/ ./
COPY --from=build /app/apps/__APP__/.next/static/ ./apps/__APP__/.next/static/
COPY --from=build /app/apps/__APP__/public/ ./apps/__APP__/public/
# The one directory the server may write to, for its own cache.
RUN mkdir -p apps/__APP__/.next/cache && chown node:node apps/__APP__/.next/cache

# The image's own non-root user. Port __PORT__ needs no capability, so the container runs with --cap-drop ALL and
# --security-opt no-new-privileges.
USER node
EXPOSE __PORT__
CMD ["node", "apps/__APP__/server.js"]
