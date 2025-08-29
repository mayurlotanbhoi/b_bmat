# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.13.1

#########################
# Build stage
#########################
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app

# Install build dependencies only (no .env, no .git, no lock files in image)
COPY --link package.json ./
COPY --link package-lock.json ./
COPY --link .env .env

# Use npm ci for deterministic builds and cache node_modules
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# Copy source files (excluding .env, .git, etc. via .dockerignore)
COPY --link . .

# Build TypeScript
RUN npm run build

#########################
# Production stage
#########################
FROM node:${NODE_VERSION}-slim AS final
WORKDIR /app

# Create non-root user
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy built app and production dependencies only

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Copy any static assets needed at runtime (e.g., public/uploads)
COPY --from=builder /app/public ./public

# Ensure the uploads directory exists and has correct permissions
RUN mkdir -p /app/public/uploads/images && \
    chown -R appuser:appgroup /app/public/uploads

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"

USER appuser

EXPOSE 5000

CMD ["npm", "start"]

