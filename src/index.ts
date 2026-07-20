/**
 * @orkestrate/sdk
 *
 * Publisher SDK for the Orkestrate agent gateway.
 *
 * Primitives (any framework):
 *   verifyRequest   — authenticate incoming gateway requests
 *   parseRequest    — decode gateway headers + body
 *   buildModel      — build an AI SDK LanguageModel from caller's BYOM config
 *   respond         — wire-format response builders (.ok / .reply / .error)
 *
 * Convenience (AI SDK):
 *   createOrkestrateHandler  — calls the above in order for generateText users
 *
 * Types:
 *   CallerModelConfig, ParsedRequest, SessionMessage, TurnContext, CloseContext,
 *   TurnResult, CreateOrkestrateHandlerOptions, OrkestrateHandlers, OrkestrateAction
 */

/* Primitives */
export { verifyRequest } from "./auth";
export { parseRequest, encodeModelConfig } from "./protocol";
export { buildModel } from "./model";
export { respond, OrkestrateError } from "./errors";
export type { OrkestrateErrorCode } from "./errors";
/* Convenience */
export { createOrkestrateHandler } from "./handler";
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
} from "./types";
