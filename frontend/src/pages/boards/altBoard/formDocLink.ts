import { TFormDocLink } from "types/altForm";
import { TFormFileRef } from "./formFilePreview";

export type { TFormDocLink };

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const YOUTUBE_ID =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;

export type TOgMeta = {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
};

/** http(s)만 허용. 실패 시 null */
export const sanitizeHttpUrl = (raw: string): string | null => {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
};

export const linkDisplayTitle = (link: TFormDocLink): string => {
  const title = String(link.title || "").trim();
  if (title) return title;
  const ogTitle = String(link.ogTitle || "").trim();
  if (ogTitle) return ogTitle;
  return link.url;
};

export const linkPreviewHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

export const youtubeThumbnailUrl = (url: string): string | null => {
  const match = String(url || "").match(YOUTUBE_ID);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
};

export const hasLinkPreview = (link: TFormDocLink): boolean =>
  Boolean(
    String(link.ogTitle || "").trim() ||
      String(link.ogImage || "").trim() ||
      String(link.ogDescription || "").trim()
  );

export const mergeOgIntoLink = (
  link: TFormDocLink,
  og: TOgMeta = {}
): TFormDocLink => {
  const fromOg = sanitizeHttpUrl(String(og.ogImage || ""));
  const ytThumb = youtubeThumbnailUrl(link.url);
  const ogImage = fromOg || link.ogImage || ytThumb || undefined;
  return {
    ...link,
    ogTitle: String(og.ogTitle || "").trim() || link.ogTitle,
    ogDescription: String(og.ogDescription || "").trim() || link.ogDescription,
    ogImage,
  };
};

/** 파일 항목 응답: 링크는 url이 있고 S3 key가 없음 */
export const isFileAnswerLink = (item: unknown): item is TFormDocLink => {
  if (!item || typeof item !== "object") return false;
  const rec = item as { url?: unknown; key?: unknown };
  return Boolean(String(rec.url || "").trim()) && !String(rec.key || "").trim();
};

export const isFileAnswerFile = (item: unknown): item is TFormFileRef => {
  if (!item || typeof item !== "object") return false;
  const rec = item as { key?: unknown; originalName?: unknown };
  if (!String(rec.key || "").trim()) return false;
  rec.originalName = String(rec.originalName || rec.key || "");
  return true;
};

export const fileAnswerLabel = (item: unknown): string => {
  if (isFileAnswerLink(item)) return linkDisplayTitle(item);
  if (isFileAnswerFile(item)) {
    return String(item.originalName || item.key || "");
  }
  return "";
};
