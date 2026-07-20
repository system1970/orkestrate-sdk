import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { OrkestrateError } from "./errors";
import type { CallerModelConfig } from "./types";

/**
 * Build an AI SDK language model from the caller's BYOM config.
 * Eng never pastes provider keys for Orkestrate traffic.
 */
export function buildModel(config: CallerModelConfig): LanguageModel {
  try {
    switch (config.provider) {
      case "openai": {
        const openai = createOpenAI({
          apiKey: config.apiKey,
          ...(config.baseURL ? { baseURL: config.baseURL } : {}),
        });
        return openai.chat(config.model);
      }
      case "anthropic": {
        const anthropic = createAnthropic({
          apiKey: config.apiKey,
          ...(config.baseURL ? { baseURL: config.baseURL } : {}),
        });
        return anthropic(config.model);
      }
      case "google": {
        const google = createGoogleGenerativeAI({
          apiKey: config.apiKey,
          ...(config.baseURL ? { baseURL: config.baseURL } : {}),
        });
        return google(config.model);
      }
      case "custom": {
        const openai = createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseURL,
        });
        return openai.chat(config.model);
      }
      default: {
        const _exhaustive: never = config.provider;
        throw new OrkestrateError("MODEL_ERROR", `Unsupported provider: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    if (error instanceof OrkestrateError) throw error;
    const message = error instanceof Error ? error.message : "Failed to build model";
    throw new OrkestrateError("MODEL_ERROR", message);
  }
}
