FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app
COPY package.json ./
RUN pnpm install --prod

COPY . .

RUN mkdir -p recibos/media_carta recibos/rollo_termico

EXPOSE 8080

CMD ["node", "server.js"]
