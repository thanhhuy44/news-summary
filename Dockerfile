# Build stage
FROM oven/bun:1 as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code and env file if it exists
COPY . .
COPY .env ./

# Build TypeScript
RUN bun run build

# Production stage
FROM oven/bun:1-slim

WORKDIR /app

# Copy package files and install production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/configs ./configs

# Copy env files if they exist
COPY --from=builder /app/.env ./

# Set environment variables
ENV NODE_ENV=production


# Expose port (will be overridden by environment variable if set)
EXPOSE ${PORT:-4000}

# Start the application
CMD ["bun", "run", "start"]
