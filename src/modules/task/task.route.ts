import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/app-error.js";
import { getTaskDetail, getTaskFilePayload } from "./task.service.js";

const paramsSchema = z.object({
  taskId: z.string().uuid("A valid task id is required."),
});

const taskRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/:taskId/file", async (request, reply) => {
    const result = paramsSchema.safeParse(request.params);

    if (!result.success) {
      throw new AppError("INVALID_TASK_ID", result.error.issues[0]?.message ?? "Invalid task id.", 400);
    }

    const file = await getTaskFilePayload(fastify, result.data.taskId);

    reply.header("Content-Type", file.mimeType);
    reply.header("Content-Disposition", `attachment; filename="${file.fileName}"`);

    return reply.send(file.stream);
  });

  fastify.get("/:taskId", async (request, reply) => {
    const result = paramsSchema.safeParse(request.params);

    if (!result.success) {
      throw new AppError("INVALID_TASK_ID", result.error.issues[0]?.message ?? "Invalid task id.", 400);
    }

    const data = await getTaskDetail(fastify, result.data.taskId);

    return reply.send({
      success: true,
      data,
    });
  });
};

export default taskRoutes;
