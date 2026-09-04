import { hasImageCaption } from "./imageCaption";

const escapeAttr = (value: string): string =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** 에디터·HTML에서 온 너비를 `180px` 형태로 정규화 */
export const parseImageWidth = (
  raw: string | number | null | undefined
): string | null => {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return `${Math.round(raw)}px`;
  }
  const text = String(raw).trim();
  if (!text) return null;
  const px = text.match(/^(\d+(?:\.\d+)?)px$/i);
  if (px) {
    const n = Number(px[1]);
    return Number.isFinite(n) && n > 0 ? `${Math.round(n)}px` : null;
  }
  const num = text.match(/^(\d+(?:\.\d+)?)$/);
  if (num) {
    const n = Number(num[1]);
    return Number.isFinite(n) && n > 0 ? `${Math.round(n)}px` : null;
  }
  return null;
};

export const readImageWidthFromElement = (
  el: HTMLElement | null | undefined
): string | null => {
  if (!el) return null;
  const img = (el.tagName === "FIGURE" ? el.querySelector("img") : el) as
    | HTMLElement
    | null;
  if (!img) return null;
  return (
    parseImageWidth(img.style.width) || parseImageWidth(img.getAttribute("width"))
  );
};

export const shouldSerializeImageAsHtml = ({
  caption,
  align,
  width,
}: {
  caption?: string | null;
  align?: string | null;
  width?: string | number | null;
}): boolean =>
  !!parseImageWidth(width) ||
  hasImageCaption(caption) ||
  (align === "center" || align === "right");

export const widthFromImgProps = (props: {
  width?: unknown;
  style?: unknown;
}): string | undefined => {
  const style = props.style;
  if (style && typeof style === "object" && !Array.isArray(style)) {
    const w = (style as { width?: unknown }).width;
    const parsed = parseImageWidth(
      typeof w === "number" || typeof w === "string" ? w : null
    );
    if (parsed) return parsed;
  }
  if (typeof style === "string") {
    const m = style.match(/(?:^|;)\s*width\s*:\s*([^;]+)/i);
    if (m) {
      const parsed = parseImageWidth(m[1]);
      if (parsed) return parsed;
    }
  }
  return parseImageWidth(props.width as string | number | null) || undefined;
};

export const serializeResizableImage = (attrs: {
  src?: string;
  alt?: string;
  caption?: string | null;
  align?: string | null;
  width?: string | number | null;
}): string => {
  const src = escapeAttr(attrs.src || "");
  const alt = escapeAttr(attrs.alt || "");
  const caption = hasImageCaption(attrs.caption)
    ? String(attrs.caption).trim()
    : "";
  const align = attrs.align === "center" || attrs.align === "right"
    ? attrs.align
    : "left";
  const width = parseImageWidth(attrs.width);
  if (!shouldSerializeImageAsHtml({ caption, align, width })) {
    return `![${attrs.alt || ""}](${attrs.src || ""})`;
  }
  const imgStyle = [
    width ? `width:${width}` : "",
    "max-width:100%",
    "height:auto",
  ]
    .filter(Boolean)
    .join(";");
  const widthAttr = width ? ` width="${parseInt(width, 10)}"` : "";
  const img = `<img src="${src}" alt="${alt}"${widthAttr} data-align="${align}" style="${imgStyle}" />`;
  if (!caption && align === "left") return img;
  const figureStyle =
    align === "center"
      ? ' style="text-align:center;margin:12px auto"'
      : align === "right"
        ? ' style="text-align:right;margin:12px 0 12px auto"'
        : "";
  const cap = caption ? `<figcaption>${escapeAttr(caption)}</figcaption>` : "";
  return `<figure data-align="${align}"${figureStyle}>${img}${cap}</figure>`;
};
