/** 강의계획서 AI 점검용 formSyllabus 필드 헬퍼 */

export type TSyllabusInputField = {
  /** 저장 키 (cell.id) */
  id: string;
  /** 표시/AI 라벨 (cell.name) */
  name: string;
  required: boolean;
};

/**
 * formSyllabus 테이블에서 input 셀만 추출
 * 저장은 id, 표시는 name (EditorParser writeByCellId와 동일)
 */
export const extractSyllabusInputFields = (
  formSyllabus: any
): TSyllabusInputField[] => {
  const fields: TSyllabusInputField[] = [];
  const seen = new Set<string>();
  if (!formSyllabus?.data) return fields;

  for (const block of formSyllabus.data) {
    if (block.type !== "table" || !block.data?.table) continue;
    for (const row of block.data.table) {
      for (const cell of row) {
        if (cell.type !== "input") continue;
        const id = cell.id || cell.name;
        const name = cell.name || cell.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        fields.push({ id, name, required: !!cell.required });
      }
    }
  }
  return fields;
};

/** info에서 필드 값 읽기 (id 우선, name 하위 호환) */
export const readSyllabusInfoValue = (
  info: any,
  field: TSyllabusInputField | string
): any => {
  if (!info || field == null) return undefined;
  if (typeof field === "string") return info[field];
  if (field.id != null && info[field.id] !== undefined) return info[field.id];
  if (field.name != null && info[field.name] !== undefined) {
    return info[field.name];
  }
  return undefined;
};

export const isSyllabusFieldFilled = (
  info: any,
  field: TSyllabusInputField | string
): boolean => {
  const value = readSyllabusInfoValue(info, field);
  return String(value ?? "").trim().length > 0;
};
