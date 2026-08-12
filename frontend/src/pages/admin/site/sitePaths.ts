const TEXT_EXT = new Set([
  "html",
  "htm",
  "css",
  "js",
  "mjs",
  "json",
  "txt",
  "md",
  "svg",
  "map",
]);

export function joinSitePath(prefix: string, name: string) {
  const cleanName = name.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!prefix) return cleanName;
  return `${prefix.replace(/\/+$/, "")}/${cleanName}`;
}

export function getSiteExt(path: string) {
  const base = path.split("/").pop() || "";
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1).toLowerCase() : "";
}

export function isSiteTextEditable(path: string) {
  return TEXT_EXT.has(getSiteExt(path));
}
