/** Wire error codes returned to the gateway. */
export type OrkestrateErrorCode =
  | "UNAUTHORIZED"
  | "BAD_REQUEST"
  | "MODEL_ERROR"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "SESSION_STALE"
  | "CONFLICT"
  | "LIMIT_EXCEEDED"
  | "INTERNAL";

function defaultStatus(code: OrkestrateErrorCode): number {
  return code === "UNAUTHORIZED"
    ? 401
    : code === "BAD_REQUEST" || code === "MODEL_ERROR"
      ? 400
      : 500;
}

export class OrkestrateError extends Error {
  readonly code: OrkestrateErrorCode;
  readonly status: number;

  constructor(code: OrkestrateErrorCode, message: string, status?: number) {
    super(message);
    this.name = "OrkestrateError";
    this.code = code;
    this.status = status ?? defaultStatus(code);
  }
}

/** Wire-format response builders. */
export const respond = {
  ok: (extra?: Record<string, unknown>) =>
    Response.json({ ok: true, ...extra } as const),

  reply: (text: string) =>
    Response.json({ reply: text } as const),

  error: (code: OrkestrateErrorCode, message: string, status?: number) =>
    Response.json(
      { error: { code, message } },
      { status: status ?? defaultStatus(code) },
    ),
};

/**
 * Convert any thrown error to a wire-format Response.
 * @internal used by createOrkestrateHandler
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof OrkestrateError) {
    return respond.error(error.code, error.message, error.status);
  }
  const message = error instanceof Error ? error.message : "Internal error";
  return respond.error("INTERNAL", message);
}
