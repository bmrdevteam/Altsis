export type GuideTocItem = {
  title: string;
  key: string;
};

export type GuideTocSection = {
  title: string;
  key: string;
  items: GuideTocItem[];
};

const MD_LINK = /\[([^\]]+)\]\(([^)]+)\)/;

export function defaultGuidePath(auth?: string | null): string {
  if (!auth) return "INDEX.md";
  if (auth === "owner") return "getting-started/README.md";
  if (auth === "admin" || auth === "manager") return "admin-guide/README.md";
  return "user-guide/README.md";
}

export function allowedGuideSet(
  docs: Record<string, string>
): Set<string> {
  return new Set(Object.keys(docs));
}

export function posixNormalize(input: string): string | null {
  const parts: string[] = [];
  for (const seg of input.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (parts.length === 0) continue;
      parts.pop();
      continue;
    }
    if (seg.includes("\\") || seg.includes("\0")) return null;
    parts.push(seg);
  }
  return parts.join("/");
}

export const GUIDE_DOC_QUERY = "doc";

export function guideHref(guideBase: string, key: string, hash = ""): string {
  const url = guideKeyToUrl(key);
  const q = url
    ? `?${GUIDE_DOC_QUERY}=${encodeURIComponent(url)}`
    : "";
  return `${guideBase}${q}${hash}`;
}

export function docKeyFromSearch(
  search: string,
  allowed: Set<string>
): { present: boolean; key: string | null } {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  if (!params.has(GUIDE_DOC_QUERY)) return { present: false, key: null };
  const raw = params.get(GUIDE_DOC_QUERY) || "";
  if (!raw) return { present: true, key: "INDEX.md" };
  return { present: true, key: urlToGuideKey(raw, allowed) };
}

export function guideKeyToUrl(key: string): string {
  let p = key.replace(/\.md$/i, "");
  if (p === "INDEX" || p === "README") return "";
  if (p.endsWith("/README")) p = p.slice(0, -"/README".length);
  return p;
}

function candidateKeys(normalized: string): string[] {
  if (!normalized) return ["INDEX.md"];
  const keys = [normalized];
  if (!normalized.toLowerCase().endsWith(".md")) {
    keys.push(`${normalized}.md`);
    keys.push(`${normalized}/README.md`);
  }
  if (normalized.toLowerCase() === "index") keys.push("INDEX.md");
  return keys;
}

export function resolveAllowedKey(
  raw: string,
  allowed: Set<string>
): string | null {
  const normalized = posixNormalize(raw.replace(/\\/g, "/"));
  if (normalized === null) return null;
  for (const key of candidateKeys(normalized)) {
    if (allowed.has(key)) return key;
  }
  return null;
}

export function urlToGuideKey(
  urlPath: string,
  allowed: Set<string>
): string | null {
  const trimmed = decodeURIComponent(urlPath || "")
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, "");
  return resolveAllowedKey(trimmed, allowed);
}

export function guideBaseFromPathname(pathname: string): string {
  const idx = pathname.indexOf("/guide");
  if (idx === -1) return "/guide";
  return pathname.slice(0, idx + "/guide".length);
}

export function restAfterGuide(pathname: string): string {
  const idx = pathname.indexOf("/guide");
  if (idx === -1) return "";
  return pathname.slice(idx + "/guide".length).replace(/^\//, "");
}

export function resolveGuideHref(
  currentKey: string,
  href: string,
  allowed: Set<string>
): string | null {
  const trimmed = (href || "").trim();
  if (!trimmed) return null;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return null;
  if (trimmed.startsWith("#")) return null;

  const [pathPart] = trimmed.split("#");
  if (!pathPart) return null;

  if (
    pathPart.startsWith("/guide/") ||
    pathPart === "/guide" ||
    pathPart.startsWith("/guide?")
  ) {
    try {
      const parsed = new URL(pathPart, "http://local.invalid");
      const fromQuery = parsed.searchParams.get(GUIDE_DOC_QUERY);
      if (fromQuery != null) {
        return fromQuery
          ? urlToGuideKey(fromQuery, allowed)
          : resolveAllowedKey("INDEX.md", allowed);
      }
      const rest =
        parsed.pathname === "/guide"
          ? ""
          : parsed.pathname.slice("/guide/".length);
      return urlToGuideKey(rest, allowed);
    } catch {
      const rest = pathPart === "/guide" ? "" : pathPart.slice("/guide/".length);
      return urlToGuideKey(rest.split("?")[0], allowed);
    }
  }

  if (pathPart.startsWith("/")) return null;

  const currentDir = currentKey.includes("/")
    ? currentKey.slice(0, currentKey.lastIndexOf("/"))
    : "";
  const joined = currentDir ? `${currentDir}/${pathPart}` : pathPart;
  return resolveAllowedKey(joined, allowed);
}

export function rewriteGuideMarkdownLinks(
  md: string,
  currentKey: string,
  allowed: Set<string>,
  guideBase: string
): string {
  return md.replace(
    /(^|[^!])\[([^\]]+)\]\(([^)]+)\)/g,
    (full, prefix: string, text: string, href: string) => {
      const key = resolveGuideHref(currentKey, href, allowed);
      if (!key) return full;
      const hashIndex = href.indexOf("#");
      const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
      return `${prefix}[${text}](${guideHref(guideBase, key, hash)})`;
    }
  );
}

export function parseGuideToc(
  indexMd: string,
  allowed: Set<string>
): GuideTocSection[] {
  const sections: GuideTocSection[] = [];
  let current: GuideTocSection | null = null;

  const pushLink = (title: string, href: string) => {
    const key = resolveGuideHref("INDEX.md", href, allowed);
    if (!key) return;
    const item = { title, key };
    if (!current) {
      current = { title, key, items: [] };
      sections.push(current);
      return;
    }
    if (current.key === key) return;
    current.items.push(item);
  };

  for (const line of indexMd.split("\n")) {
    const heading = /^(#{2,4})\s+(.*)$/.exec(line);
    if (heading) {
      const inner = heading[2];
      const link = MD_LINK.exec(inner);
      if (link) {
        const key = resolveGuideHref("INDEX.md", link[2], allowed);
        if (key) {
          current = { title: link[1], key, items: [] };
          sections.push(current);
        }
      }
      continue;
    }
    const cell = /^\|\s*\[([^\]]+)\]\(([^)]+)\)\s*\|/.exec(line);
    if (cell) pushLink(cell[1], cell[2]);
  }

  return sections;
}

export function elementIdFromHash(hash: string): string | null {
  if (!hash || hash === "#") return null;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function queryByHashId(
  root: ParentNode,
  hash: string
): Element | null {
  const id = elementIdFromHash(hash);
  if (!id) return null;
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(id)
      : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  try {
    return root.querySelector(`#${escaped}`);
  } catch {
    return null;
  }
}

export function isGuideInternalHref(href: string, guideBase: string): boolean {
  if (!href) return false;
  try {
    const url = new URL(href, "http://local.invalid");
    const path = url.pathname;
    if (path === guideBase || path.startsWith(`${guideBase}/`)) return true;
    return path === "/guide" || path.startsWith("/guide/");
  } catch {
    return (
      href === guideBase ||
      href.startsWith(`${guideBase}/`) ||
      href.startsWith(`${guideBase}?`) ||
      href.startsWith("/guide?") ||
      href.startsWith("/guide/")
    );
  }
}
