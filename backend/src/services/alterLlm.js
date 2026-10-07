/**
 * Wires the provider adapters to the existing HTTP client.
 * The agent loop calls llm.generate and does not pick a protocol.
 */

import { FORCE_FINAL_NOTE, buildAgentSystemPrompt } from "./alterAgentProtocol.js";
import { generateText } from "./aiProvider.js";
import { createLlm } from "../alter/providers/llm.js";

const renderFenceSystem = (req = {}) => {
  const tools = req.catalog || req.tools || [];
  const base = buildAgentSystemPrompt({
    tools,
    guidelines: req.guidelines || "",
    pageNote: req.pageNote || "",
    protocol: "fence",
  });
  return req.forceFinal ? `${base}\n\n${FORCE_FINAL_NOTE}` : base;
};

export const llm = createLlm({
  renderFenceSystem,
  complete: (provider, req) =>
    generateText({
      provider,
      apiKey: req.apiKey,
      model: req.model,
      systemInstruction: req.system,
      messages: req.messages,
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      tools: req.tools,
      toolChoice: req.toolChoice,
    }),
});
