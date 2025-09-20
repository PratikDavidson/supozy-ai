# Use the official Node.js image as base
FROM node:22-alpine AS base

# Install pnpm
ARG PNPM_VERSION=8.15.8
ARG PNPM_VERSION=8.15.8
RUN apk add --no-cache libc6-compat python3 make g++ \
    && npm install -g pnpm@$PNPM_VERSION

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Dependencies stage
FROM base AS deps

# Install dependencies
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder

# Set them as environment variables for the build
ARG NEXT_PUBLIC_USER_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_USER_ID

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM base AS runner

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "run", "start"]