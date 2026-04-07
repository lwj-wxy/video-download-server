import type { FastifyPluginAsync } from "fastify";

import { parseParsePayload, parseVideo } from "./parse.service.js";

const parseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/", async (request, reply) => {
    const payload = parseParsePayload(request.body);
    const data = await parseVideo(fastify, payload);

    return reply.send({
      success: true,
      data,
    });
  });
};

export default parseRoutes;
