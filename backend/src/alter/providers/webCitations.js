/**
 * Pull https citations out of a provider search response.
 * Snippets are the cited span only. Encrypted page bodies are ignored.
 */

import { MAX_WEB_RESULTS, WEB_SNIPPET_MAX, WEB_TITLE_MAX } from "../core/limits.js";

const clip = (value, max) => String(value || "").replace(/\s+/g, " ").trim().slice(0, max);

const httpsUrl = (value) => {
  const url = String(value || "").trim();
  if (!/^https:\/\/\S+$/i.test(url) || url.length > 500) return "";
  return url;
};

const walk = (node, visit, depth = 0) => {
  if (!node || depth > 8) return;
  if (Array.isArray(node)) {
    for (const item of node) walk(item, visit, depth + 1);
    return;
  }
  if (typeof node !== "object") return;
  visit(node);
  for (const [key, child] of Object.entries(node)) {
    if (key === "encrypted_content" || key === "encrypted_index") continue;
    if (child && typeof child === "object") walk(child, visit, depth + 1);
  }
};

const pushHit = (hits, seen, limit, { title, url, snippet }) => {
  const clean = httpsUrl(url);
  if (!clean || seen.has(clean) || hits.length >= limit) return;
  seen.add(clean);
  hits.push({
    title: clip(title || "출처", WEB_TITLE_MAX) || "출처",
    url: clean,
    snippet: clip(snippet, WEB_SNIPPET_MAX),
  });
};

const hostLabel = (url) => {
  try {
    const host = new URL(String(url || "")).hostname.replace(/^www\./i, "");
    return host || "출처";
  } catch (_) {
    return "출처";
  }
};

/**
 * OpenAI only returns web_search_call.action.sources when the request asks
 * for them. Those rows are https URLs without titles, and the message can
 * still say there were no results.
 */
export const citationsFromOpenAISources = (json, limit = MAX_WEB_RESULTS) => {
  const hits = [];
  const seen = new Set();
  const cap = Math.max(1, limit);
  const items = Array.isArray(json?.output) ? json.output : [];
  for (const item of items) {
    if (item?.type && item.type !== "web_search_call") continue;
    const sources = item?.action?.sources;
    if (!Array.isArray(sources)) continue;
    for (const source of sources) {
      if (source?.type && source.type !== "url") continue;
      const titled = clip(source?.title, WEB_TITLE_MAX);
      pushHit(hits, seen, cap, {
        title: titled || hostLabel(source?.url),
        url: source?.url,
        snippet: "",
      });
    }
  }
  return hits;
};

/** OpenAI output_text annotations of type url_citation, with the cited span. */
export const citationsFromAnnotations = (json, limit = MAX_WEB_RESULTS) => {
  const hits = [];
  const seen = new Set();
  const cap = Math.max(1, limit);
  walk(json?.output, (node) => {
    if (!Array.isArray(node.annotations) || typeof node.text !== "string") return;
    const text = node.text;
    for (const note of node.annotations) {
      if (note?.type && note.type !== "url_citation") continue;
      const start = Number(note?.start_index);
      const end = Number(note?.end_index);
      const span =
        Number.isFinite(start) && Number.isFinite(end) && end > start ? text.slice(start, end) : "";
      pushHit(hits, seen, cap, { title: note?.title, url: note?.url, snippet: span });
    }
  });
  return hits;
};

/** Anthropic web_search_result blocks. Cited text only, never encrypted content. */
export const citationsFromAnthropic = (json, limit = MAX_WEB_RESULTS) => {
  const hits = [];
  const seen = new Set();
  const cap = Math.max(1, limit);
  for (const block of Array.isArray(json?.content) ? json.content : []) {
    const rows = block?.type === "web_search_tool_result" && Array.isArray(block.content)
      ? block.content
      : [block];
    for (const row of rows) {
      if (row?.type && row.type !== "web_search_result") continue;
      pushHit(hits, seen, cap, {
        title: row?.title,
        url: row?.url,
        snippet: row?.cited_text || "",
      });
    }
  }
  return hits;
};

/** Gemini grounding chunks. The snippet is the support segment, not the page. */
export const citationsFromGemini = (json, limit = MAX_WEB_RESULTS) => {
  const meta = json?.candidates?.[0]?.groundingMetadata || {};
  const chunks = Array.isArray(meta.groundingChunks) ? meta.groundingChunks : [];
  const supports = Array.isArray(meta.groundingSupports) ? meta.groundingSupports : [];
  const snippetFor = (index) => {
    for (const support of supports) {
      const indices = support?.groundingChunkIndices || [];
      if (!indices.includes(index)) continue;
      if (support?.segment?.text) return support.segment.text;
    }
    return "";
  };
  const hits = [];
  const seen = new Set();
  const cap = Math.max(1, limit);
  chunks.forEach((chunk, index) => {
    const web = chunk?.web || {};
    pushHit(hits, seen, cap, {
      title: web.title,
      url: web.uri || web.url,
      snippet: snippetFor(index),
    });
  });
  return hits;
};

export const providerSearchStatus = (provider, json) => {
  if (provider === "openai") return String(json?.status || "");
  if (provider === "anthropic") return String(json?.stop_reason || "");
  if (provider === "gemini") return String(json?.candidates?.[0]?.finishReason || "");
  return "";
};
