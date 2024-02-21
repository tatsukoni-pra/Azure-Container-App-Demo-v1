/**
 * "Werner Heisenberg"というメッセージを受信した場合の処理
 */
import { wait } from '../utils/util.js';

async function wernerProcessMessage(message) {
  console.log('user_id: ' + message.body.content.user_id);
  console.log('text: ' + message.body.content.text);
  // 10~30秒待機
  await wait(getRandomInt(10000, 30000));
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export { wernerProcessMessage };
