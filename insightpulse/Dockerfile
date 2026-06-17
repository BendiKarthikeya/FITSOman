# Multi-stage build for InsightPulse

FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# --- Runtime image ---
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built artifacts
COPY --from=builder /app/dist ./dist

# Cloud Run will set PORT; our server reads it
ENV PORT=8080

# Start the server
CMD ["node", "dist/index.js"]

