const { delay, ServiceBusClient, ServiceBusMessage } = require("@azure/service-bus");
const { CosmosClient } = require("@azure/cosmos");
require('dotenv').config();

const revisionName = 'my-container-app-v1--' + process.env.REVISION_SUFFIX;

const connectionString = process.env.CONNECTION_STRING;
const topicName = "mytopic";
const subscriptionName = process.env.SUBSCRIPTION_NAME;

const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = cosmosClient.database('TatsukoniTest2');
const container = database.container('worker-process-demo-v1');

// 同時に処理するプロセス数
const PARALLEL_PROCESS_COUNT = 5;

// 処理状態
const STATUS_PROCESSING = 'processing';
const STATUS_DONE = 'done';

async function processMessage(message) {
  console.log(`Received message ID: ${message.messageId}`);
  console.log(`Start v2 Received message: ${message.body}`);

  // CosmosDBレコード作成
  const newItem = {
    id: message.messageId,
    containerName: revisionName,
    status: STATUS_PROCESSING,
  };
  await container.items.create(newItem);

  // 10秒待機
  await wait(10000);
  console.log(`Finish v2 Received message: ${message.body}`);
  // コスモスDBレコード ステータス更新
  await container
    .item(message.messageId, message.messageId)
    .patch([
      { op: "replace", path: "/status", value: STATUS_DONE }
    ]);

  // 5秒待機
  await wait(5000);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const sbClient = new ServiceBusClient(connectionString);
  const receiver = sbClient.createReceiver(topicName, subscriptionName);

  const myErrorHandler = async (error) => {
      console.log(error);
  };

  let processingPromises = [];

  // メッセージを並列に処理する
  receiver.subscribe({
      processMessage: async (messageReceived) => {
          const promise = processMessage(messageReceived);
          processingPromises.push(promise);
          if (processingPromises.length >= PARALLEL_PROCESS_COUNT) {
              await Promise.all(processingPromises);
              processingPromises = [];
          }
      },
      processError: myErrorHandler
  });

  // プログラムが自動的に終了しないようにする
  // シグナルを受け取った場合のみ終了処理を行う
  process.on('SIGINT', async () => {
      console.log("Closing receiver and client...");
      await receiver.close();
      await sbClient.close();
      process.exit(0);
  });
}

main().catch((err) => {
  console.log("Error occurred: ", err);
  process.exit(1);
});
