import { TAltFormField } from "types/altForm";

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
