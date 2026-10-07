/**
 * One zod schema becomes the OpenAI/Anthropic JSON Schema and the Gemini
 * fence argument line. $schema and zod's default safe-integer bounds are
 * removed so the native schema stays the one providers already accept.
 */

import { z } from "zod";

const SAFE_INT_MIN = Number.MIN_SAFE_INTEGER;
const SAFE_INT_MAX = Number.MAX_SAFE_INTEGER;

const stripSchemaNoise = (schema) => {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(stripSchemaNoise);
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "$schema" || key === "$id") continue;
    if (key === "minimum" && value === SAFE_INT_MIN) continue;
    if (key === "maximum" && value === SAFE_INT_MAX) continue;
    out[key] = stripSchemaNoise(value);
  }
  return out;
};

/** @param {import("zod").ZodType} input */
export const jsonSchemaFromZod = (input) =>
  stripSchemaNoise(z.toJSONSchema(input, { target: "draft-7" }));

const typeName = (schema) => {
  if (Array.isArray(schema?.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }
  if (schema?.type === "array") {
    const item = schema.items || {};
    if (item.type === "integer") return "integer[]";
    if (item.type === "string") return "string[]";
    if (item.type === "number") return "number[]";
    return `${typeName(item)}[]`;
  }
  if (schema?.type === "object") return objectArguments(schema);
  if (schema?.type === "integer") return "integer";
  if (schema?.type === "number") return "number";
  if (schema?.type === "boolean") return "boolean";
  if (schema?.type === "string") return "string";
  return "unknown";
};

/** Compact fence argument line. Optional keys are marked. Generated, not handwritten. */
export const fenceArguments = (schema) => objectArguments(schema);

const objectArguments = (schema) => {
  const required = new Set(schema?.required || []);
  const parts = Object.entries(schema?.properties || {}).map(([key, value]) => {
    const optional = required.has(key) ? "" : "?";
    return `"${key}"${optional}: ${typeName(value)}`;
  });
  return parts.length ? `{ ${parts.join(", ")} }` : "{}";
};
