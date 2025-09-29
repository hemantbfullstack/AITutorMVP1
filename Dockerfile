FROM node:22.16.0-alpine
WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S node -u 1001

# Change ownership
RUN chown -R node:nodejs /usr/src/app
USER node

# Expose port
EXPOSE 5000

# Start the application
CMD ["pnpm", "start"]