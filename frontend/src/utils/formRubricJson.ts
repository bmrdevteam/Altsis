import { TFormRubric, TRubricLevel } from "types/altForm";

export const FORM_RUBRIC_JSON_KIND = "altsis-form-rubrics";
export const FORM_RUBRIC_JSON_VERSION = 1;
export const MAX_IMPORTED_RUBRICS = 20;
export const MAX_IMPORTED_LEVELS = 12;
export const MAX_RUBRIC_TITLE_LENGTH = 200;
export const MAX_LEVEL_LABEL_LENGTH = 200;
export const MAX_LEVEL_DESCRIPTION_LENGTH = 2000;

export type TFormRubricExportLevel = {
  label: string;
  description: string;
  points?: number;
};

export type TFormRubricExportItem = {
  title: string;
  levels: TFormRubricExportLevel[];
};

export type TFormRubricExport = {
  kind: typeof FORM_RUBRIC_JSON_KIND;
  version: typeof FORM_RUBRIC_JSON_VERSION;
  title: string;
  rubrics: TFormRubricExportItem[];
};

const clip = (value: unknown, max: number): string =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const finitePoints = (value: unknown): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value;
};

const exportLevel = (level: TRubricLevel): TFormRubricExportLevel => {
  const out: TFormRubricExportLevel = {
    label: clip(level.label, MAX_LEVEL_LABEL_LENGTH),
    description: clip(level.description, MAX_LEVEL_DESCRIPTION_LENGTH),
  };
  const points = finitePoints(level.points);
  if (points != null) out.points = points;
  return out;
};

const exportRubric = (rubric: TFormRubric): TFormRubricExportItem => ({
  title: clip(rubric.title, MAX_RUBRIC_TITLE_LENGTH) || "루브릭",
  levels: (rubric.levels || []).map(exportLevel),
});

/**
 * 양식 루브릭을 전용 JSON으로 직렬화한다. id는 넣지 않는다.
 */
export const serializeFormRubricsExport = (
  formTitle: string,
  rubrics: TFormRubric[]
): TFormRubricExport => {
  const name = clip(formTitle, MAX_RUBRIC_TITLE_LENGTH);
  return {
    kind: FORM_RUBRIC_JSON_KIND,
    version: FORM_RUBRIC_JSON_VERSION,
    title: name ? `${name} 루브릭` : "루브릭",
    rubrics: (rubrics || []).map(exportRubric),
  };
};

const extractRawRubrics = (data: unknown): unknown[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const rubrics = (data as { rubrics?: unknown }).rubrics;
    if (Array.isArray(rubrics)) return rubrics;
  }
  throw new Error("루브릭 JSON 형식이 아닙니다.");
};

const normalizeLevel = (raw: unknown): TRubricLevel | null => {
  if (!raw || typeof raw !== "object") return null;
  const lv = raw as Record<string, unknown>;
  const label = clip(lv.label, MAX_LEVEL_LABEL_LENGTH);
  const description = clip(lv.description, MAX_LEVEL_DESCRIPTION_LENGTH);
  const points = finitePoints(lv.points);
  if (!label && !description && points == null) return null;
  const level: TRubricLevel = {
    id: crypto.randomUUID(),
    label,
    description,
  };
  if (points != null) level.points = points;
  return level;
};

const normalizeRubric = (raw: unknown, index: number): TFormRubric | null => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.levels)) return null;
  if (r.levels.length > MAX_IMPORTED_LEVELS) {
    throw new Error(
      `수준은 루브릭당 ${MAX_IMPORTED_LEVELS}개까지 가져올 수 있습니다.`
    );
  }
  const levels = r.levels
    .map(normalizeLevel)
    .filter((lv): lv is TRubricLevel => lv != null);
  if (levels.length === 0) return null;
  return {
    id: crypto.randomUUID(),
    title: clip(r.title, MAX_RUBRIC_TITLE_LENGTH) || `루브릭 ${index + 1}`,
    levels,
  };
};

/**
 * 전용 JSON, 루브릭 배열, 양식 전체 JSON에서 루브릭을 읽어 새 id로 복제한다.
 */
export const parseFormRubricImport = (data: unknown): TFormRubric[] => {
  const rawList = extractRawRubrics(data);
  if (rawList.length > MAX_IMPORTED_RUBRICS) {
    throw new Error(
      `루브릭은 한 번에 ${MAX_IMPORTED_RUBRICS}개까지 가져올 수 있습니다.`
    );
  }
  const rubrics = rawList
    .map((item, i) => normalizeRubric(item, i))
    .filter((item): item is TFormRubric => item != null);
  if (rubrics.length === 0) {
    throw new Error("가져올 루브릭이 없습니다.");
  }
  return rubrics;
};

export const parseFormRubricImportText = (text: string): TFormRubric[] => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("JSON 파일이 아닙니다.");
  }
  return parseFormRubricImport(data);
};
