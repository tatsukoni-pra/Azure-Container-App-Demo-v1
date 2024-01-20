# 動かし方
```
node worker/worker.js
```

# 動作原理
## 複数のワーカー処理を並行実行させる
- ワーカー処理部分を、非同期関数（`async function processMessage(message)`）として定義しておくことで、ワーカー処理を非同期に（複数処理を並行で）実行させる

## 並行処理実行数を制限する
- `let processingMessageIds = [];`を定義し、処理中のメッセージidを逐一格納していく
- 非同期処理が完了したら（`Promise.prototype.finally()`）、`processingMessageIds`から、対象処理のメッセージidを削除する
- `processingMessageIds`の中身が指定数以上の場合は、任意の秒数待機 & 再度`processingMessageIds`を数える を繰り返すことで、指定数以上の処理が並行実行されないように制御する。

コード例
```javascript
// processingMessageIds: 処理中のメッセージid(一意)を格納する
let processingMessageIds = [];
// subscribe: 内部的にService Busからのメッセージストリームを監視し、メッセージが受信可能になれば受信する
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
    },
    processError: async (error) => {
      console.log(error);
    }
});
```

# 動作検証
## 検証環境
- キューの最大同時実行回数は`PARALLEL_PROCESS_COUNT = 5`に設定している
- キュー受信後、各ワーカー処理は、ランダムな時間（10~30秒）sleep後完了する

## 1：1~5個 のキューを同時に受信
1~5個のキューは並行で処理される。（同時に開始する）

![スクリーンショット 2024-01-20 19 05 30](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/83cd4655-12a0-4569-84c9-6e7d0cf963a3)

![スクリーンショット 2024-01-20 19 05 42](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/f459d54b-dbd7-45cc-a01b-3d11ddb1f346)

## 2：6個~ のキューを同時に受信
- 5個までのキューは、同時に並行実行される
- 上記のキューのうちいずれかが終了したら、6個目以降のキューが順次実施される

![スクリーンショット 2024-01-20 19 18 39](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/cf57d0cd-822a-4135-9a6e-750122f8274e)

![スクリーンショット 2024-01-20 19 22 31](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/c8a4e55b-4057-40e9-8b4a-25c293e28323)

## 3：約1秒おきに1つのキューが送信される
- 5個までのキューは、約1秒おきに実行される（キュー受信後に実行される）
- 6個目以降の処理は、上記のキューのうちいずれかが終了し次第、順次実施される

![スクリーンショット 2024-01-20 19 47 58](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/fb9d7ce6-85d3-4bf2-b088-81b8fd70be27)
