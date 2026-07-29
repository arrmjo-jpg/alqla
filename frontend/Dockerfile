FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# next.config.ts::rewrites() reads NEXT_CONFIG_API_BASE_URL at `next build` time (baked
# into .next/routes-manifest.json — not re-read at container runtime), so it must be
# available here, not just via the container's runtime `environment:`. Deliberately a
# separate var from API_BASE_URL: setting API_BASE_URL itself at build time would also
# make page-level data fetching (lib/env.ts) treat the backend as reachable during static
# generation, but "backend" isn't resolvable from this isolated build stage — that hangs
# every static page's fetch for 60s×3 retries and fails the build.
ARG NEXT_CONFIG_API_BASE_URL
ENV NEXT_CONFIG_API_BASE_URL=$NEXT_CONFIG_API_BASE_URL

RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]