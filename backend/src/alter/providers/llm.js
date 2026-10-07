/**
 * llm.generate picks one adapter and returns a normalized turn.
 * HTTP stays behind the injected complete(). This module does not import tools.
 */

import { createAnthropicAdapter } from "./anthropic.js";
import { createGeminiAdapter } from "./gemini.js";
import { withFenceTools } from "./fence.js";
import { createOpenAIAdapter } from "./openai.js";
import { createScriptedAdapter, isScriptedDemoKey } from "./scripted.js";

const isProduction = () => String(process.env.NODE_ENV || "").trim() === "production";

const invalidDemoKey = () => {
  const err = new Error("AI API key is not valid");
  err.status = 401;
  err.code = "AI_INVALID_API_KEY";
  return err;
};

/**
 * @param {{ complete: (provider: string, req: object) => Promise<object>, renderFenceSystem?: (req: object) => string }} deps
 */
export const createLlm = ({ complete, renderFenceSystem } = {}) => {
  const call = (provider) => (req) => complete(provider, req);
  const openai = createOpenAIAdapter({ complete: call("openai") });
  const anthropic = createAnthropicAdapter({ complete: call("anthropic") });
  const gemini = withFenceTools(createGeminiAdapter({ complete: call("gemini") }), {
    renderSystem: renderFenceSystem,
  });
  const scripted = createScriptedAdapter();
  const adapters = { openai, anthropic, gemini, scripted };

  const resolve = ({ provider, apiKey } = {}) => {
    const name = String(provider || "").trim();
    if (isScriptedDemoKey(apiKey) && isProduction()) throw invalidDemoKey();
    if (!isProduction() && (name === "scripted" || isScriptedDemoKey(apiKey))) return scripted;
    if (name === "anthropic") return anthropic;
    if (name === "openai") return openai;
    return gemini;
  };

  return {
    adapters,
    resolve,
    /**
     * @param {object} req system, messages, tools, and the academy provider/key
     * @returns {Promise<{ text: string, toolCalls: object[], usage: object|null, finish: string }>}
     */
    async generate(req = {}) {
      const adapter = req.adapter || resolve(req);
      return adapter.generate({
        ...req,
        system: req.system ?? req.systemInstruction,
      });
    },
  };
};
