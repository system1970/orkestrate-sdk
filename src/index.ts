/**
 * @orkestrate/sdk
 *
 * Publisher & Client SDK for the Orkestrate agent gateway.
 *
 * Primitives (any framework):
 *   verifyRequest   — authenticate incoming gateway requests
 *   parseRequest    — decode gateway headers + body
 *   buildModel      — build an AI SDK LanguageModel from caller's BYOM config
 *   respond         — wire-format response builders (.ok / .reply / .error)
 *
 * Client & Inbox:
 *   Orkestrate      — client class for sending work orders into Orkestrate Inbox
 *
 * Convenience (AI SDK):
 *   createOrkestrateHandler  — calls the above in order for generateText users
 *
 * Types:
 *   CallerModelConfig, ParsedRequest, SessionMessage, TurnContext, CloseContext,
 *   TurnResult, CreateOrkestrateHandlerOptions, OrkestrateHandlers, OrkestrateAction,
 *   InboxSendOptions, OrkestrateClientOptions
 */

/* Primitives */
export { verifyRequest } from "./auth.js";
export { parseRequest, parseMessages, encodeModelConfig } from "./protocol.js";
export { buildModel } from "./model.js";
export { respond, OrkestrateError } from "./errors.js";
export type { OrkestrateErrorCode } from "./errors.js";

/* Client & Inbox */
export { Orkestrate } from "./inbox.js";
export type { InboxSendOptions, OrkestrateClientOptions } from "./inbox.js";

/* Convenience */
export { createOrkestrateHandler } from "./handler.js";
export type {
  CallerModelConfig,
  CloseContext,
  CreateOrkestrateHandlerOptions,
  OrkestrateAction,
  OrkestrateHandlers,
  ParsedRequest,
  SessionMessage,
  TurnContext,
  TurnResult,
} from "./types.js";
