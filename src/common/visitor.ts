import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";

const VISITOR_COOKIE_NAME = "visitor_id";
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function getVisitorId(request: FastifyRequest) {
  const visitorId = request.cookies[VISITOR_COOKIE_NAME];

  return typeof visitorId === "string" && visitorId.length > 0 ? visitorId : null;
}

export function ensureVisitorId(request: FastifyRequest, reply: FastifyReply) {
  const existingVisitorId = getVisitorId(request);

  if (existingVisitorId) {
    return existingVisitorId;
  }

  const visitorId = uuidv4();

  reply.setCookie(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });

  return visitorId;
}
