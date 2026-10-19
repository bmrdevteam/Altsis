import { asUsage } from "./usage.js";

/** One model turn that called tools, and whether every result was wrapped. */
export const toolTurn = (names, wrapped, usage, auditsIn, diagnosticsIn) => {
  const called = (Array.isArray(names) ? names : [])
    .map((name) => String(name || ""))
    .filter(Boolean);
  const bodies = (Array.isArray(wrapped) ? wrapped : []).map((row) => String(row ?? ""));
  const turn = {
    names: called,
    untrusted:
      called.length > 0 &&
      bodies.length > 0 &&
      bodies.every((row) => row.includes('untrusted="true"')),
  };
  const counted = asUsage(usage);
  if (counted) turn.usage = counted;
  const audits = (Array.isArray(auditsIn) ? auditsIn : [])
    .map((row) => ({
      name: String(row?.name || ""),
      query: String(row?.query || "").replace(/\s+/g, " ").trim().slice(0, 200),
    }))
    .filter((row) => row.name && row.query);
  if (audits.length) turn.audits = audits;
  const diagnostics = (Array.isArray(diagnosticsIn) ? diagnosticsIn : [])
    .map((row) => toolDiagnostic(row?.name, row))
    .filter(Boolean);
  if (diagnostics.length) turn.diagnostics = diagnostics;
  return turn;
};

const safeToken = (value) => {
  const token = String(value || "").trim();
  return /^[A-Za-z0-9_.-]{1,64}$/.test(token) ? token : "";
};

/** Status and code only. Provider messages and signed URLs are not trace data. */
export const toolDiagnostic = (name, data) => {
  if (!data || typeof data !== "object") return null;
  const error = safeToken(data.error);
  const providerCode = safeToken(data.providerCode);
  const status = Number(data.providerStatus ?? data.status);
  const row = { name: safeToken(name) || "tool" };
  if (error) row.error = error;
  if (providerCode) row.providerCode = providerCode;
  if (status >= 100 && status <= 599) row.status = status;
  if (!row.error && !row.providerCode && row.status == null) return null;
  return row;
};
