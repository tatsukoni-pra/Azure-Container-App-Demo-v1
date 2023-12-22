FROM node:18.19.0-bullseye-slim

WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y procps && \
  npm install

# Blue/Greenデプロイ用に検証する
EXPOSE 80

CMD ["node", "worker.js"]
