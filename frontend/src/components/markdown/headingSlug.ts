/** GitHub-compatible heading ids so documentation TOC hashes resolve. */

export function githubHeadingSlug(value: string): string {
  return value
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replace(/ /g, "-");
}

export function createGithubSlugger(): (value: string) => string {
  const seen = new Map<string, number>();
  return (value: string) => {
    const base = githubHeadingSlug(value);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

export function flattenHeadingText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenHeadingText).join("");
  if (typeof node === "object" && node !== null && "props" in node) {
    const props = (node as { props?: { children?: unknown } }).props;
    return flattenHeadingText(props?.children);
  }
  return "";
}
