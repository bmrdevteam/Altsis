import { asUsage } from "./usage.js";

/** One model turn that called tools, and whether every result was wrapped. */
export const toolTurn = (names, wrapped, usage, auditsIn) => {
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
  return turn;
};
