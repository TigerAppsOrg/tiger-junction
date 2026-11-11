// Maps errors from the Stellic flow onto HTTP responses for the backend.

import type { FastifyReply } from "fastify";
import {
  NeedsReconnectError,
  PushNotApprovedError,
  PushPendingError,
  StellicLoginError,
} from "../stellic/errors.ts";
import { HttpError } from "../stellic/http.ts";
import { NotFoundError } from "../service.ts";

export function handleStellicError(err: unknown, reply: FastifyReply) {
  if (err instanceof PushPendingError) {
    // Not a failure: the student hasn't approved the push yet. Call finish again.
    return reply.code(202).send({ status: "pending" });
  }
  if (err instanceof PushNotApprovedError) {
    // Not a gateway failure: this login attempt is over and the student starts
    // again. The message is meant for them.
    return reply
      .code(410)
      .send({ error: "push_not_approved", detail: err.message });
  }
  if (err instanceof NeedsReconnectError) {
    return reply
      .code(409)
      .send({ error: "needs_reconnect", detail: err.message });
  }
  if (err instanceof NotFoundError) {
    return reply.code(404).send({ error: err.message });
  }
  if (err instanceof StellicLoginError) {
    reply.log.warn({ err }, "Stellic login failed");
    return reply
      .code(502)
      .send({ error: "stellic_login_failed", detail: err.message });
  }
  if (err instanceof HttpError) {
    reply.log.warn({ err }, "Stellic unreachable");
    return reply
      .code(502)
      .send({ error: "stellic_unreachable", detail: err.message });
  }
  throw err;
}
