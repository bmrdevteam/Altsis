/** 회람·선택 인원 등 객체를 [object Object] 없이 읽기 쉬운 문자열로 만든다. */

type PersonLike = {
  userName?: string;
  userId?: string;
  value?: unknown;
  label?: string;
};

export function formatPersonLabel(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const v = value as PersonLike;
  const name = typeof v.userName === "string" ? v.userName.trim() : "";
  const id = typeof v.userId === "string" ? v.userId.trim() : "";
  if (name && id) return `${name} (${id})`;
  if (name) return name;
  if (id) return id;
  return "";
}

export function formatReadableValue(value: unknown): string {
  if (value == null || value === "") return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatReadableValue(item)).filter(Boolean).join(", ");
  }
  if (typeof value === "object") {
    const person = formatPersonLabel(value);
    if (person) return person;
    const v = value as PersonLike;
    if (typeof v.value === "string" && v.value.trim()) return v.value.trim();
    if (typeof v.label === "string" && v.label.trim()) return v.label.trim();
    return "";
  }
  return "";
}
