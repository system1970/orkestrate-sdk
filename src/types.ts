import type { LanguageModel } from "ai";

/** Actions the gateway may send on POST. */
export type OrkestrateAction = "start_session" | "send_message" | "end_session" | "ping";

/**
 * Caller model config (BYOM). Sent by the gateway as
 * `X-Orkestrate-Model` (base64url JSON). Built into an AI SDK model for you.
 */
export type CallerModelConfig = {
  provider: "openai" | "anthropic" | "google" | "custom";
  model: string;
  apiKey: string;
  /** Required for `custom`; optional override for openai-compatible hosts. */
  baseURL?: string;
};

/** A single turn in the session conversation history. */
export type SessionMessage = {
  role: "user" | "assistant";
  content: string;
};

/** Result of parsing a gateway request. */
export type ParsedRequest = {
  action: OrkestrateAction;
  sessionId?: string;
  callerId?: string;
  message?: string;
  modelConfig?: CallerModelConfig;
  /** Full conversation history, including the latest user message. */
  messages?: SessionMessage[];
};

export type TurnContext = {
  /** Gateway-minted session id. Use this as your chat id. */
  sessionId: string;
  /** The new user text for this turn (also last element of `messages`). */
  message: string;
  /** Full conversation history including the latest user turn. */
  messages: SessionMessage[];
  /** Ready for `generateText` / `streamText` / agents. */
  model: LanguageModel;
  action: "start_session" | "send_message";
  /** Opaque Clerk user id when the gateway sends it. */
  callerId?: string;
};

export type CloseContext = {
  sessionId: string;
  callerId?: string;
};

export type TurnResult = {
  reply: string;
};

export type CreateOrkestrateHandlerOptions = {
  /** Shared secret from the Orkestrate dashboard (registration). */
  secret: string;
  /**
   * Run one agent turn.
   * The gateway forwards `messages` (full conversation history) on every turn.
   * Eng can feed `ctx.messages` directly into `generateText` — no DB needed.
   */
  onTurn: (ctx: TurnContext) => Promise<TurnResult>;
  /**
   * Optional cleanup when the gateway closes a session.
   * Safe to omit; response is still `{ ok: true }`.
   */
  onClose?: (ctx: CloseContext) => Promise<void>;
};

export type OrkestrateHandlers = {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
};
