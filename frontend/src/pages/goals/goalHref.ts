/**
 * 목표 항목 → 이동 경로
 *
 * 기록(archive) 카운트는 본인 Archive 기준이므로 역할과 무관하게 /myArchive 로 이동한다.
 */

export type TGoalSectionKey =
  | "enrolled"
  | "created"
  | "mentoring"
  | "archive"
  | "board";

export function hrefForGoalItem(params: {
  sectionKey: TGoalSectionKey | string;
  itemId?: string;
  label: string;
  boardId?: string;
}): string {
  const { sectionKey, itemId, label, boardId } = params;

  if (sectionKey === "enrolled") {
    return "/courses#수강 현황";
  }
  if (sectionKey === "created") {
    return "/courses#개설 수업";
  }
  if (sectionKey === "mentoring") {
    return "/courses#담당 수업";
  }
  if (sectionKey === "archive") {
    const archiveLabel = itemId?.startsWith("archive:")
      ? itemId.slice("archive:".length)
      : label;
    return `/myArchive/${encodeURIComponent(archiveLabel)}`;
  }
  if (sectionKey === "board") {
    if (itemId === "board:전체 할 일") {
      return "/boards#할 일";
    }
    if (boardId) {
      return `/boards/${boardId}`;
    }
    return "/boards#할 일";
  }
  return "/goals";
}

export function goalItemKind(
  sectionKey: string
): "enrolled" | "created" | "mentoring" | "archive" | "board" | "other" {
  if (
    sectionKey === "enrolled" ||
    sectionKey === "created" ||
    sectionKey === "mentoring" ||
    sectionKey === "archive" ||
    sectionKey === "board"
  ) {
    return sectionKey;
  }
  return "other";
}
