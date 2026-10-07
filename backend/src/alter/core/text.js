import { SUMMARY_MAX } from "./limits.js";

export const stripMarkdown = (text) =>
  String(text ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`\n]*)`/g, "$1")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "");

export const truncateSummary = (text, max = SUMMARY_MAX) => {
  const value = stripMarkdown(text).replace(/\s+/g, " ").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
};

const MARKDOWN_LINK_RE = /!?\[([^\]]*)\]\(([^)\s]+)\)/g;
const BARE_URL_RE = /(?<!\()https?:\/\/[^\s<>"'\\\])]+/gi;
const BULLET_RE = /^(\s*)(?:[-*•]|\d+[.)])\s+(.*)$/;
const POINTER_TAIL_RE =
  /\s*(?:자세한\s*내용은\s*)?(?:아래|다음|관련)\s*링크[^\n]{0,40}$/;

const decodePath = (value) => {
  let current = String(value || "");
  for (let i = 0; i < 2; i += 1) {
    try {
      const next = decodeURIComponent(current.replace(/\+/g, " "));
      if (next === current) break;
      current = next;
    } catch (_) {
      break;
    }
  }
  return current;
};

const linkPathsFrom = (links) =>
  (Array.isArray(links) ? links : [])
    .map((link) => String(link?.path || "").trim())
    .filter((path) => path.startsWith("/") && !path.startsWith("//"));

const appOrigin = () => {
  const raw = String(process.env.URL || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch (_) {
    return "";
  }
};

const comparablePath = (pathname, search) => {
  const path = `${pathname || ""}${search || ""}`;
  const hashless = path.split("#")[0];
  return decodePath(hashless);
};

const hrefMatchesLinkPath = (href, paths) => {
  const raw = String(href || "").trim();
  if (!raw || !paths.length) return false;
  const allowed = new Set(paths.map((path) => comparablePath(path, "")));
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return allowed.has(comparablePath(raw, ""));
  }
  if (!/^https?:\/\//i.test(raw)) return false;
  let url;
  try {
    url = new URL(raw);
  } catch (_) {
    return false;
  }
  const origin = appOrigin();
  if (!origin || url.origin !== origin) return false;
  return allowed.has(comparablePath(url.pathname, url.search));
};

const bulletBody = (line) => {
  const match = String(line || "").match(BULLET_RE);
  return match ? match[2] : null;
};

const residueAfterLabels = (body, labels) => {
  let rest = String(body || "").trim();
  const sorted = labels.filter(Boolean).sort((a, b) => b.length - a.length);
  for (const label of sorted) rest = rest.split(label).join(" ");
  return rest.replace(/[\s,·|/~\-–—:：.]+/g, "");
};

const stripPointerTail = (line) => {
  const text = String(line || "");
  if (bulletBody(text) != null) return null;
  const match = text.match(POINTER_TAIL_RE);
  if (!match) return null;
  if (!/확인|참고|[:：]/.test(match[0])) return null;
  return text.slice(0, match.index).replace(/[\s:：]+$/g, "").trim();
};

const cleanupStrippedLinkLines = (text, labels) => {
  const source = String(text || "").split("\n");
  const lines = source.map((line) => {
    const next = stripPointerTail(line);
    return next == null ? line : next;
  });
  const drop = new Set();
  let follow = false;
  for (let i = 0; i < lines.length; i += 1) {
    const edited = lines[i] !== source[i];
    const body = bulletBody(lines[i]);
    const content = (body == null ? lines[i] : body).trim();
    const labelOnly = !residueAfterLabels(content, labels);
    if (edited && !content) {
      drop.add(i);
      follow = true;
      continue;
    }
    if (edited) {
      follow = true;
      continue;
    }
    if (body != null && (!content || labelOnly)) {
      drop.add(i);
      continue;
    }
    if (!content) {
      if (follow) drop.add(i);
      follow = false;
      continue;
    }
    if (follow && body == null && labelOnly) {
      drop.add(i);
      continue;
    }
    follow = false;
  }
  return lines.filter((_, index) => !drop.has(index)).join("\n");
};

/**
 * Links the client can open are attached separately. Keep a markdown link or
 * bare URL only when it is an exact app path (or an absolute URL on
 * process.env.URL). Anything else keeps the label text, then empty bullets
 * and link lead-ins are removed.
 */
export const stripUnmatchedLinks = (text, links) => {
  const paths = linkPathsFrom(links);
  const strippedLabels = [];
  let out = String(text || "").replace(MARKDOWN_LINK_RE, (full, label, href) => {
    if (hrefMatchesLinkPath(href, paths)) return full;
    const kept = String(label || "").trim();
    strippedLabels.push(kept);
    return kept;
  });
  out = out.replace(BARE_URL_RE, (url) => {
    const core = url.replace(/[.,!?;:]+$/g, "");
    const tail = url.slice(core.length);
    if (hrefMatchesLinkPath(core, paths)) return url;
    return tail;
  });
  out = cleanupStrippedLinkLines(out, strippedLabels);
  return out
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([.,!?;:])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
