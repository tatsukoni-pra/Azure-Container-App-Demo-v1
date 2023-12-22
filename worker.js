const { delay, ServiceBusClient, ServiceBusMessage } = require("@azure/service-bus");

const connectionString = ""
const queueName = "myqueue"

// 同時に処理するプロセス数
const PARALLEL_PROCESS_COUNT = 5;

async function processMessage(message) {
  console.log(`Start Received message: ${message.body}`);
  // 10秒待機
  await wait(10000);
  console.log(`Finish Received message: ${message.body}`);
  // 5秒待機
  await wait(5000);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const sbClient = new ServiceBusClient(connectionString);
  const receiver = sbClient.createReceiver(queueName);

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
