import { TAltFormField } from "types/altForm";
import { hasFormResponseDraftContent } from "./formResponseLocalDraft";

export type TFormViewMode = "compose" | "review";

/**
 * URL/딥링크 모드를 내부 작성·조회에 반영할지.
 * 재사용·수정 직후 skip은 내부 모드가 외부와 같아질 때까지 유지한다.
 */
export const shouldApplyExternalViewMode = ({
  skipInternal,
  internalMode,
  externalMode,
}: {
  skipInternal: boolean;
  internalMode: TFormViewMode;
  externalMode: TFormViewMode;
}): { apply: boolean; nextSkip: boolean } => {
  if (skipInternal) {
    return {
      apply: false,
      nextSkip: internalMode !== externalMode,
    };
  }
  return {
    apply: internalMode !== externalMode,
    nextSkip: false,
  };
};

/**
 * 작성 탭에서 기존 행을 고치던 중 다시 새 건을 열지.
 * 내 응답→작성은 로컬 `new` 초안 복원(resolveMultipleComposeData)이라 여기 해당하지 않는다.
 */
export const shouldStartNewMultipleCompose = ({
  allowMultiple,
  viewMode,
  hasEditingRow,
}: {
  allowMultiple: boolean;
  viewMode: TFormViewMode;
  hasEditingRow: boolean;
}): boolean => {
  if (!allowMultiple) return false;
  if (viewMode !== "compose") return false;
  return hasEditingRow;
};

/** 복수 응답 작성 슬롯: 내용 있는 브라우저 초안만 쓰고, 없으면 빈 양식. */
export const resolveMultipleComposeData = ({
  localDraft,
}: {
  localDraft?: Record<string, any> | null;
}): Record<string, any> => {
  if (!localDraft || !hasFormResponseDraftContent(localDraft)) return {};
  return { ...localDraft };
};

/** 수정 초안: 행 값이 있으면 덮고, 비어 있으면 조회 중 화면 값을 유지. */
export const mergeRowDataForEdit = (
  rowData: Record<string, any> | null | undefined,
  fallback: Record<string, any> = {}
): Record<string, any> => {
  const src =
    rowData && typeof rowData === "object" && !Array.isArray(rowData)
      ? rowData
      : {};
  return { ...fallback, ...src };
};

/** 제출 행을 추가 제출 초안으로 복사. 승인·시스템 키는 제외하고 파일은 유지. */
export const copyRowDataForReuse = (
  data: Record<string, any> | null | undefined,
  fields: Pick<TAltFormField, "_id" | "type">[]
): Record<string, any> => {
  const copied: Record<string, any> = { ...(data || {}) };
  for (const key of Object.keys(copied)) {
    if (key.startsWith("_")) delete copied[key];
  }
  for (const field of fields) {
    if (field.type === "approval" || field.type === "aiChat") {
      delete copied[field._id];
    }
  }
  return copied;
};
