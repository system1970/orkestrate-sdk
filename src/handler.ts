import { verifyRequest } from "./auth";
import { OrkestrateError, toErrorResponse } from "./errors";
import { buildModel } from "./model";
import { parseRequest } from "./protocol";
import { respond } from "./errors";
import type { CreateOrkestrateHandlerOptions, OrkestrateHandlers } from "./types";

const PROTOCOL_VERSION = 1;

/**
 * Create GET + POST handlers for a Next.js (or any) route.
 *
 * Thin convenience over the SDK primitives:
 *   verifyRequest → parseRequest → buildModel → onTurn → respond
 *
 * For full control, import the primitives directly.
 */
export function createOrkestrateHandler(
  options: CreateOrkestrateHandlerOptions,
): OrkestrateHandlers {
  if (!options?.secret || typeof options.secret !== "string") {
    throw new Error("createOrkestrateHandler: `secret` is required");
  }
  if (typeof options.onTurn !== "function") {
    throw new Error("createOrkestrateHandler: `onTurn` is required");
  }

  const { secret, onTurn, onClose } = options;

  async function GET(_request: Request): Promise<Response> {
    return respond.ok({ protocol: PROTOCOL_VERSION });
  }

  async function POST(request: Request): Promise<Response> {
    try {
      verifyRequest(request, secret);
      const parsed = await parseRequest(request);

      switch (parsed.action) {
        case "ping":
          return respond.ok();

        case "end_session": {
          if (onClose) {
            await onClose({
              sessionId: parsed.sessionId!,
              callerId: parsed.callerId,
            });
          }
          return respond.ok();
        }

        case "start_session":
        case "send_message": {
          if (!parsed.sessionId) {
            return respond.error("BAD_REQUEST", "Missing session id");
          }
          if (!parsed.message) {
            return respond.error("BAD_REQUEST", "Missing message");
          }
          if (!parsed.modelConfig) {
            return respond.error("BAD_REQUEST", "Missing caller model config");
          }
          if (!parsed.messages || parsed.messages.length === 0) {
            return respond.error("BAD_REQUEST", "Missing or empty messages");
          }

          const model = buildModel(parsed.modelConfig);

          let result: Awaited<ReturnType<typeof onTurn>>;
          try {
            result = await onTurn({
              sessionId: parsed.sessionId,
              message: parsed.message,
              messages: parsed.messages,
              model,
              action: parsed.action,
              callerId: parsed.callerId,
            });
          }
          catch (error) {
            if (error instanceof OrkestrateError)
              throw error;
            const msg = error instanceof Error ? error.message : "Turn failed";
            throw new OrkestrateError("INTERNAL", msg);
          }

          if (!result ||
            typeof result.reply !== "string" ||
            result.reply.length === 0) {
            throw new OrkestrateError("INTERNAL", "onTurn must return { reply: non-empty string }");
          }

          return respond.reply(result.reply);
        }

        default: {
          const _never: never = parsed.action;
          throw new OrkestrateError("BAD_REQUEST", `Unknown action: ${String(_never)}`);
        }
      }
    }
    catch (error) {
      return toErrorResponse(error);
    }
  }

  return { GET, POST };
}
