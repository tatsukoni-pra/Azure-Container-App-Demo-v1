import { ServiceBusClient } from "@azure/service-bus";
import crypto from "crypto";
import { config } from 'dotenv';
config();

const connectionString = process.env.CONNECTION_STRING;
const queueName = "myqueue"

// ユニークIDを生成
const messageId = () => {
    return crypto.randomUUID() + '--' + new Date().getTime();
}

const messages = [
    { 
        body: {
            "type": "Albert Einstein",
            "content": {
                "user_id": 1,
                "text": "hello world",
            }
        },
        messageId: messageId()
    },
    // { body: "Werner Heisenberg", messageId: messageId() },
    // { body: "Marie Curie", messageId: messageId() },
    // { body: "Steven Hawking", messageId: messageId() },
    // { body: "Isaac Newton", messageId: messageId() },
    // { body: "Niels Bohr", messageId: messageId() },
    // { body: "Michael Faraday", messageId: messageId() },
    // { body: "Galileo Galilei", messageId: messageId() },
    // { body: "Johannes Kepler", messageId: messageId() },
    // { body: "Nikolaus Kopernikus", messageId: messageId() },
    // { body: "Albert Einstein", messageId: messageId() },
    // { body: "Werner Heisenberg", messageId: messageId() },
    // { body: "Marie Curie", messageId: messageId() },
    // { body: "Steven Hawking", messageId: messageId() },
    // { body: "Isaac Newton", messageId: messageId() },
    // { body: "Albert Einstein", messageId: messageId() },
    // { body: "Werner Heisenberg", messageId: messageId() },
    // { body: "Marie Curie", messageId: messageId() },
    // { body: "Steven Hawking", messageId: messageId() },
    // { body: "Isaac Newton", messageId: messageId() },
    // { body: "Niels Bohr", messageId: messageId() },
    // { body: "Michael Faraday", messageId: messageId() },
    // { body: "Galileo Galilei", messageId: messageId() },
    // { body: "Johannes Kepler", messageId: messageId() },
    // { body: "Nikolaus Kopernikus", messageId: messageId() },
    // { body: "Albert Einstein", messageId: messageId() },
    // { body: "Werner Heisenberg", messageId: messageId() },
    // { body: "Marie Curie", messageId: messageId() },
    // { body: "Steven Hawking", messageId: messageId() },
    // { body: "Isaac Newton", messageId: messageId() },
];

async function main() {
    const sbClient = new ServiceBusClient(connectionString);
    const sender = sbClient.createSender(queueName);

    try {
        let batch = await sender.createMessageBatch();
        for (let i = 0; i < messages.length; i++) {
            if (!batch.tryAddMessage(messages[i])) {
                await sender.sendMessages(batch);
                batch = await sender.createMessageBatch();

                if (!batch.tryAddMessage(messages[i])) {
                    throw new Error("Message too big to fit in a batch");
                }
            }
        }
        await sender.sendMessages(batch);

        console.log(`Sent a batch of messages to the queue: ${queueName}`);
        await sender.close();
    } finally {
        await sbClient.close();
    }
}

main().catch((err) => {
    console.log("Error occurred: ", err);
    process.exit(1);
 });
