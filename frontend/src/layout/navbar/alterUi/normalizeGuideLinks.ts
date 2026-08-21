export type TAlterGuideLink = {
  kind: "page" | "guide";
  title: string;
  path: string;
};

export const normalizeClientGuideLinks = (
  links?: TAlterGuideLink[] | null
): TAlterGuideLink[] => {
  if (!Array.isArray(links)) return [];
  const out: TAlterGuideLink[] = [];
  const seen = new Set<string>();
  for (const row of links) {
    const kind = row?.kind === "page" || row?.kind === "guide" ? row.kind : null;
    const title = String(row?.title || "").trim();
    const path = String(row?.path || "").trim();
    if (!kind || !title || !path.startsWith("/") || path.startsWith("//")) {
      continue;
    }
    if (path.includes("://") || path.includes("\\")) continue;
    const id = `${kind}:${path}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ kind, title, path });
    if (out.length >= 4) break;
  }
  return out;
};
