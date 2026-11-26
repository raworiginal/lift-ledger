# syntax=docker/dockerfile:1

FROM node:22.21.1-bookworm-slim AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install -g pnpm@12.18.0
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22.21.1-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4545
WORKDIR /app
COPY --from=builder /app/.output ./.output
USER node
EXPOSE 4545
WORKDIR /app/.output
CMD ["node", "server/index.mjs"]
