# Multi-stage build для backend

# ========================================
# Этап 1: Development
# ========================================
FROM node:18-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ========================================
# Этап 2: Production dependencies
# ========================================
FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

# ========================================
# Этап 3: Production
# ========================================
FROM node:18-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "--require", "./src/tracing.js", "src/server.js"]