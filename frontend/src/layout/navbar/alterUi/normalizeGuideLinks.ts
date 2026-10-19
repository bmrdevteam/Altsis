export type TAlterGuideLink = {
  kind: "page" | "guide" | "web";
  title: string;
  path: string;
};

const httpsSource = (path: string) =>
  /^https:\/\/\S+$/i.test(path) && path.length <= 500;

export const normalizeClientGuideLinks = (
  links?: TAlterGuideLink[] | null
): TAlterGuideLink[] => {
  if (!Array.isArray(links)) return [];
  const out: TAlterGuideLink[] = [];
  const seen = new Set<string>();
  let app = 0;
  let web = 0;
  for (const row of links) {
    const title = String(row?.title || "").trim();
    const path = String(row?.path || "").trim();
    if (row?.kind === "web") {
      if (!title || !httpsSource(path) || web >= 5) continue;
      const id = `web:${path}`;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ kind: "web", title, path });
      web += 1;
      continue;
    }
    const kind = row?.kind === "page" || row?.kind === "guide" ? row.kind : null;
    if (!kind || !title || !path.startsWith("/") || path.startsWith("//")) {
      continue;
    }
    if (path.includes("://") || path.includes("\\") || app >= 4) continue;
    const id = `${kind}:${path}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ kind, title, path });
    app += 1;
  }
  return out;
};
