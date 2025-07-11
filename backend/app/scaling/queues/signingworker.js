// queues/signingWorker.js
import { Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { signJobHandler } from '../jobs/signingJobHandler.js';

const connection = new IORedis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

// Ensure sequential execution per user
const userLocks = new Map();

export const signingWorker = new Worker('signing', async (job) => {
  const userId = job.data.userId;
  if (!userId) throw new Error("Missing userId in job data");

  while (userLocks.get(userId)) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  userLocks.set(userId, true);
  try {
    await signJobHandler(job.data);
  } finally {
    userLocks.delete(userId);
  }

}, {
  connection,
  lockDuration: 3000,
  concurrency: 3,     
  stalledInterval: 300
});



signingWorker.on('completed', (job) => {
  console.log(`Job completed: ${job.id}`);
});

signingWorker.on('failed', (job, err) => {
  console.error(`Job failed: ${job.id}`, err);
});
