import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import PQueue from 'p-queue';
import { signJobHandler } from '../jobs/signingJobHandler.js';

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

const userQueues = new Map(); 

export const signingWorker = new Worker(
  'signing',
  async (job) => {
    const userId = job.data.userId;
    if (!userId) throw new Error('Missing userId in job data');

    if (!userQueues.has(userId)) {
      userQueues.set(userId, new PQueue({ concurrency: 3 }));
    }

    const queue = userQueues.get(userId);

    await queue.add(() => signJobHandler(job.data));
  },
  {
    connection,
    concurrency: 5, 
    lockDuration: 60000,
    stalledInterval: 30000,
  }
);

signingWorker.on('completed', (job) => {
  console.log(`Job completed: ${job.id}`);
});

signingWorker.on('failed', (job, err) => {
  console.error(`Job failed: ${job?.id}`, err);
});
