FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build
COPY server.js .
EXPOSE 80
CMD ["node", "server.js"]
