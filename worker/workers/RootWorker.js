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
  // 既に処理が実行済 or 処理中の場合は処理をスキップ
  if (await checkDuplicate(message)) {
    console.log(getCurrentDateTime() + `Skip Because of Duplicate id: ${message.messageId} type: ${message.body.type}`);
    return;
  }

  // Start
  await createStartLog(message);

  // 実処理は各ワーカーに移譲
  // TODO: 分岐増えてきたら、配列でマッピング管理みたいにできないか？
  // TODO: 分岐ごと別ファイルに分ける。ここだけ編集できるようにする
  switch (message.body.type) {
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
  console.log(getCurrentDateTime() + `Start id: ${message.messageId} type: ${message.body.type}`);
  const newItem = {
    id: message.messageId,
    containerName: revisionName,
    status: STATUS_PROCESSING,
  };
  await container.items.create(newItem);
}

async function checkDuplicate(message) {
  const query = `SELECT VALUE COUNT(1) FROM c WHERE c.id = @id`;
  const { resources: count } = await container.items
    .query({ query, parameters: [{ name: "@id", value: message.messageId }] })
    .fetchAll();
  return count[0] != 0;
}

async function createFinishLog(message) {
  console.log(getCurrentDateTime() + `Finish id: ${message.messageId} type: ${message.body.type}`);
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
