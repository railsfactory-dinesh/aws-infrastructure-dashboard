# ==========================================
# Stage 1: Build Vite Frontend Assets
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Server with AWS CLI
# ==========================================
FROM node:20-slim AS runner

# Install AWS CLI v2 and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    ca-certificates \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependencies and application code
COPY package*.json ./
RUN npm ci --only=production

COPY server.js ./
COPY lib/ ./lib/
COPY --from=builder /app/dist ./dist

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3001
ENV AWS_PAGER=""

EXPOSE 3001

CMD ["node", "server.js"]
