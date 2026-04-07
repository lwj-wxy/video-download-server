import type { FastifyPluginAsync } from "fastify";

import { ensureVisitorId } from "../../common/visitor.js";
import { createDownloadTask, parseDownloadPayload } from "./download.service.js";

const downloadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/", async (request, reply) => {
    const visitorId = ensureVisitorId(request, reply);
    const payload = parseDownloadPayload(request.body);
    const data = await createDownloadTask(fastify, visitorId, payload);

    return reply.send({
      success: true,
      data,
    });
  });
};

export default downloadRoutes;
