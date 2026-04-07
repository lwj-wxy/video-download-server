import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { ZodError } from "zod";

import { isAppError } from "./common/app-error.js";
import cookiePlugin from "./plugins/cookie.js";
import prismaPlugin from "./plugins/prisma.js";
import redisPlugin from "./plugins/redis.js";
import queuePlugin from "./plugins/queue.js";
import parseRoutes from "./modules/parse/parse.route.js";
import downloadRoutes from "./modules/download/download.route.js";
import taskRoutes from "./modules/task/task.route.js";
import { startDownloadCleanup } from "./services/download-cleanup.js";
import { env } from "./config/env.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  const allowedOrigins = env.FRONTEND_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  await app.register(fastifyCors, {
    origin: allowedOrigins,
    credentials: true,
  });
  await app.register(cookiePlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(queuePlugin);

  await app.register(parseRoutes, { prefix: "/api/parse" });
  await app.register(downloadRoutes, { prefix: "/api/download" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });

  startDownloadCleanup(app);

  app.get("/health", async () => ({
    success: true,
    data: {
      status: "ok",
    },
  }));

  app.setErrorHandler((error, _request, reply) => {
    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "Invalid request payload.",
        },
      });
    }

    app.log.error(error);

    return reply.status(500).send({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong on the server.",
      },
    });
  });

  return app;
}
