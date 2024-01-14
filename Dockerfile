FROM node:18.19.0-bullseye-slim

WORKDIR /app
COPY . .

RUN apt-get update && apt-get install -y procps && \
  npm install

CMD ["node", "worker.js"]
