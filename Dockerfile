# Use official Node image
FROM node:22.16.0-alpine

# Set working directory
WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm@latest

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code (set ownership to node)
COPY --chown=node:node . .
COPY .env.production ./
COPY .env ./

# Build the application
RUN pnpm build

# Run as non-root
USER node

# Expose port
EXPOSE 5000

# Set default environment variable
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/index.cjs"]
