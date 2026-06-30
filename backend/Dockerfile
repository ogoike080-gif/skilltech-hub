FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache curl
RUN apk add --no-cache ffmpeg

# Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Production image
# Production image
FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache ffmpeg
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN mkdir -p logs uploads
EXPOSE 5000
USER node
CMD ["node", "src/index.js"]
