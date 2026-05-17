FROM node:22-slim

WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY public ./public
COPY src ./src
COPY docs ./docs
COPY samples ./samples

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
