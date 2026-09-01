export type TParsedTime = {
  ampm: "am" | "pm";
  hour12: number;
  minute: number;
};

export function parseTimeValue(
  value: string | undefined | null
): TParsedTime | null {
  if (!value || typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour24) || hour24 < 0 || hour24 > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const ampm: "am" | "pm" = hour24 < 12 ? "am" : "pm";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { ampm, hour12, minute };
}

export function toHHmm(
  ampm: "am" | "pm",
  hour12: number,
  minute: number
): string {
  let hour24 = hour12 % 12;
  if (ampm === "pm") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function formatTimeDisplay(
  value: string | undefined | null
): string {
  const parsed = parseTimeValue(value);
  if (!parsed) return "";
  const ampmLabel = parsed.ampm === "am" ? "오전" : "오후";
  return `${ampmLabel} ${String(parsed.hour12).padStart(2, "0")}:${String(
    parsed.minute
  ).padStart(2, "0")}`;
}
