export const IMAGE_CAPTION_PLACEHOLDER = "캡션 입력…";

export const hasImageCaption = (
  caption: string | null | undefined
): boolean => {
  const text = String(caption || "").trim();
  return !!text && text !== IMAGE_CAPTION_PLACEHOLDER;
};

/** 실제 캡션이 있을 때만 캡션 DOM을 둔다. 빈 입력칸은 편집 중에도 만들지 않는다. */
export const shouldRenderImageCaption = (
  _editable: boolean,
  caption: string | null | undefined
): boolean => hasImageCaption(caption);

/** 캡션 입력 안내를 쓰지 않는다. */
export const imageCaptionPlaceholder = (
  _editable: boolean,
  _caption: string | null | undefined
): string | undefined => undefined;
