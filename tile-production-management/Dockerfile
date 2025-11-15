# Multi-stage Dockerfile for tile-production-management (NestJS)
FROM node:22-alpine AS builder

WORKDIR /app

# Install build deps
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy sources and build
COPY . .
RUN npm run build

## Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only what we need for runtime
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy built artifacts
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
