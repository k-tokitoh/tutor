FROM node:22-slim

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npx", "ts-node", "src/index.ts"]
