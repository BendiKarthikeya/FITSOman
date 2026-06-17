# Multi-stage build for BusinessMatchOman app
# Stage 1: Build client and server
FROM node:20-bullseye AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# Build client (Vite) and server bundle (esbuild)
RUN npm run build

# Stage 2: Runtime image
FROM node:20-bullseye AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy only what the server needs at runtime
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle

# Install production dependencies only
RUN npm ci --omit=dev || npm install --omit=dev --no-audit --no-fund

# Cloud Run expects the container to listen on the port defined here
EXPOSE 5000

# Start the server (the server binds to port 5000 internally)
CMD ["node", "dist/index.js"]
