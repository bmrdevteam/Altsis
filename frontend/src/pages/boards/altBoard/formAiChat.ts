import { TFormAiChatSummary } from "types/aiChat";

export const isAiChatFieldType = (type?: string) => type === "aiChat";

export const parseAiChatSummary = (value: unknown): TFormAiChatSummary | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const sessionId = String(raw.sessionId || "").trim();
  if (!sessionId) return null;
  return {
    sessionId,
    messageCount: Number(raw.messageCount || 0),
    studentMessageCount: Number(raw.studentMessageCount || 0),
    lastMessagePreview: raw.lastMessagePreview
      ? String(raw.lastMessagePreview)
      : undefined,
    lastMessageAt: raw.lastMessageAt ? String(raw.lastMessageAt) : undefined,
  };
};

export const isAiChatRequiredMet = (value: unknown) => {
  const summary = parseAiChatSummary(value);
  return Number(summary?.studentMessageCount || 0) >= 1;
};

export const formatAiChatCell = (value: unknown) => {
  const summary = parseAiChatSummary(value);
  if (!summary) return "";
  const n = summary.studentMessageCount || 0;
  const preview = (summary.lastMessagePreview || "").trim();
  const label = n > 0 ? `대화 ${n}턴` : "대화 없음";
  return preview ? `${label} · ${preview}` : label;
};
