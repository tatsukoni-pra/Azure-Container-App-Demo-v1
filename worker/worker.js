/**
 * Service Bus のメッセージを受信して、ワーカーに処理を移譲する
 */
import { ServiceBusClient } from "@azure/service-bus";
import { processMessage } from './workers/RootWorker.js';
import { wait } from './utils/util.js';
import { config } from 'dotenv';
config();

const connectionString = process.env.CONNECTION_STRING;
const topicName = "myqueue";
const subscriptionName = process.env.SUBSCRIPTION_NAME;

// 同時に処理するプロセス数
const PARALLEL_PROCESS_COUNT = 5;

async function main() {
  const sbClient = new ServiceBusClient(connectionString);
  const receiver = sbClient.createReceiver(topicName, subscriptionName);

  // メッセージを受信する
  let processingMessageIds = [];
  receiver.subscribe({
      processMessage: async (message) => {
        processingMessageIds.push(message.messageId);
        processMessage(message).finally(() => {
          processingMessageIds = processingMessageIds.filter(id => id !== message.messageId);
        });
        // 実行中のワーカー処理数が5以上の場合は、5以下になるまで待機する
        while (processingMessageIds.length >= PARALLEL_PROCESS_COUNT) {
          await wait(1000); // 1秒待機
        }
        // 複数コンテナで処理を分散させるために、ランダムな時間待機する
        await wait(Math.random() * 1000);
      },
      processError: async (error) => {
        console.log(error);
      }
  });

  // シグナルを受け取った場合のみ終了処理を行う
  async function gracefulShutdown(signal) {
    await receiver.close();
    await sbClient.close();
    console.error(`処理が異常終了しました。受信されたシグナル: ${signal}`);
    console.error("実行中だった message IDs:", processingMessageIds);
    process.exit(1);
  }
  process.on("SIGINT", async function () {
    await gracefulShutdown("SIGINT");
  });
  process.on("SIGTERM", async function () {
    await gracefulShutdown("SIGTERM");
  });
  process.on("SIGHUP", async function () {
    await gracefulShutdown("SIGHUP");
  });
}

main().catch((err) => {
  console.log("Error occurred: ", err);
  process.exit(1);
});
