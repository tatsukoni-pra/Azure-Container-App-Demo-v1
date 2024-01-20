import { CosmosClient } from '@azure/cosmos';
import { config } from 'dotenv';
config();

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = client.database("TatsukoniTest2");
const container = database.container("worker-process-demo-v1");

async function countPending(containerName) {
  const query = `SELECT VALUE COUNT(1) FROM c WHERE c.containerName = @containerName AND c.status = 'processing'`;
  const { resources: count } = await container.items
    .query({ query, parameters: [{ name: "@containerName", value: containerName }] })
    .fetchAll();

  return count[0];
}

const containerName = process.argv[2];
countPending(containerName)
  .then(count => {
    console.log(count);
  })
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });
