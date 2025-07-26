FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN pnpm i

COPY . .

EXPOSE 8080

CMD ["pnpm", "start"]

ENTRYPOINT ["pnpm", "run", "dev"]
