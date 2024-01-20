/**
 * 各ワーカー処理のルートファイル
 */
import { CosmosClient } from '@azure/cosmos';
import { albertProcessMessage } from './AlbertWorker.js';
import { otherProcessMessage } from './OtherWorker.js';
import { wernerProcessMessage } from './WernerWorker.js';
import { config } from 'dotenv';
config();

const revisionName = 'my-container-app-v1--' + process.env.REVISION_SUFFIX;
const cosmosClient = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = cosmosClient.database('TatsukoniTest2');
const container = database.container('worker-process-demo-v1');

// 処理状態
const STATUS_PROCESSING = 'processing';
const STATUS_DONE = 'done';

async function processMessage(message) {
  // Start
  await createStartLog(message);

  // 実処理は各ワーカーに移譲
  switch (message.body) {
    case "Albert Einstein":
      await albertProcessMessage(message);
      break;
    case "Werner Heisenberg":
      await wernerProcessMessage(message);
      break;
    default:
      await otherProcessMessage(message);
  }

  // Finish
  await createFinishLog(message);
}

async function createStartLog(message) {
  console.log(getCurrentDateTime() + `Start id: ${message.messageId} message: ${message.body}`);
  const newItem = {
    id: message.messageId,
    containerName: revisionName,
    status: STATUS_PROCESSING,
  };
  await container.items.create(newItem);
}

async function createFinishLog(message) {
  console.log(getCurrentDateTime() + `Finish id: ${message.messageId} message: ${message.body}`);
  await container
    .item(message.messageId, message.messageId)
    .patch([
      { op: "replace", path: "/status", value: STATUS_DONE }
    ]);
}

function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  return `【${year}-${month}-${day} ${hours}:${minutes}:${seconds}】`;
}

export { processMessage };
