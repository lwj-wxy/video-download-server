import { Queue } from "bullmq";
import fp from "fastify-plugin";

import { env } from "../config/env.js";

export default fp(async (fastify) => {
  const queue = new Queue(env.DOWNLOAD_QUEUE_NAME, {
    connection: fastify.redis,
  });

  fastify.decorate("downloadQueue", queue);

  fastify.addHook("onClose", async () => {
    await queue.close();
  });
});
