FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3003

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY server.mjs package*.json ./

RUN mkdir -p data && chown -R node:node /app

USER node

VOLUME ["/app/data"]
EXPOSE 3003

CMD ["node", "server.mjs"]
