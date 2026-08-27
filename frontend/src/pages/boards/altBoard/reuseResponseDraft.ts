import { TAltFormField } from "types/altForm";

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

/** 복수 응답에서 작성=새 건인지. 단건·이미 새 작성 중이면 false. */
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
  if (viewMode === "review") return true;
  return hasEditingRow;
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
