import type { Slice } from "@tiptap/pm/model";

/** 복사 시 text/plain에 화면에 보이는 글만 넣는다 (HTML/마크다운 태그 제외). */
export const serializeClipboardPlainText = (slice: Slice): string =>
  slice.content.textBetween(0, slice.content.size, "\n\n");
