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
- 1~5個のキューは並行で処理される。（同時に開始する）

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

## 4：複数のコンテナが稼働している場合
- Azure環境で、複数コンテナが稼働している場合の挙動を検証する。
- ここでは、3台のコンテナが稼働しているとする。
![スクリーンショット-2024-01-20-22-30-32](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/cff918b7-345b-4b4f-b7e9-87a39d9b22b4)

抽出用KQLは以下
```KQL
ContainerAppConsoleLogs_CL
| project Log_s, RevisionName_s, ContainerId_s, time_t
| where RevisionName_s == "my-container-app-v1--1705757029"
| where time_t >= datetime(Y-m-d H:i:s)
| order by time_t desc
```

### 4-1：1~5個 のキューを同時に受信
- 1~5個のキューは並行で処理される。（同時に開始する）
- 複数コンテナ稼働時も1回だけ実行される。（どれか1つのコンテナで実行される）

![スクリーンショット 2024-01-20 22 43 25](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/3c10e786-0197-464c-b65b-cc416a886caa)

![スクリーンショット-2024-01-20-22-51-20](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/35922682-0bf7-421e-a57a-61a09b987cde)

### 4-2：15個 のキューを同時に受信
- 1コンテナあたりの並行処理最大実行数は5。
- ただしコンテナが3台稼働しているため、15個の処理までは同時に並行実行される。

![スクリーンショット-2024-01-20-22-59-40](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/ed2bb0bd-1dc8-4dbb-92b4-878fd58ef5a4)

### 4-3：30個 のキューを同時に受信
- 15個までのキューは、同時に並列実行される
- 上記のキューのうちいずれかが終了したら、16個目以降のキューが順次実施される

![スクリーンショット-2024-01-20-23-04-40](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/d4798caa-9c0d-4136-a83a-d33bc8e8461f)

### 4-4：約1秒おきに1つのキューが送信される
- 上限数（15個）に達するまでは、受信でき次第、いずれかのコンテナで処理実行される

![スクリーンショット-2024-01-20-23-10-35](https://github.com/tatsukoni-pra/Azure-Container-App-Demo-v1/assets/90994143/2ba7e643-dd6e-48df-9968-b824ab0a59aa)
