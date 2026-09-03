export const IMAGE_CAPTION_PLACEHOLDER = "캡션 입력…";

export const hasImageCaption = (
  caption: string | null | undefined
): boolean => {
  const text = String(caption || "").trim();
  return !!text && text !== IMAGE_CAPTION_PLACEHOLDER;
};

/** 편집 중이거나 실제 캡션이 있을 때만 캡션 DOM을 둔다. */
export const shouldRenderImageCaption = (
  editable: boolean,
  caption: string | null | undefined
): boolean => editable || hasImageCaption(caption);

/** 편집 중 빈 캡션에만 안내 문구. 조회·출력에는 넣지 않는다. */
export const imageCaptionPlaceholder = (
  editable: boolean,
  caption: string | null | undefined
): string | undefined =>
  editable && !hasImageCaption(caption)
    ? IMAGE_CAPTION_PLACEHOLDER
    : undefined;
