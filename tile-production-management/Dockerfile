# === BUILDER STAGE ===
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy sources and build
COPY . .
RUN npm run build

# === DEVELOPMENT STAGE ===
FROM node:22-alpine AS dev
WORKDIR /app

ENV NODE_ENV=development
ENV PORT=5555

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code (will be overridden by volume mount in docker-compose)

# Build once at image build time (for fallback)

EXPOSE 5555

# Watch mode - will reload on file changes via volume mount
CMD ["npm", "run", "start:dev"]

# === PRODUCTION STAGE ===
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only production dependencies
COPY package*.json ./
RUN npm install --production --legacy-peer-deps

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]