FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p recibos/media_carta recibos/rollo_termico

EXPOSE 8080

CMD ["node", "server.js"]
