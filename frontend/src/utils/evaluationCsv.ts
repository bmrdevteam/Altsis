export type TEvaluationCsvRow = {
  studentId: string;
  studentGrade?: string;
  studentName?: string;
  evaluation: Record<string, string>;
};

export type TApplyEvaluationCsvResult = {
  applied: number;
  skipped: number;
  unknownIds: string[];
  enrollments: any[];
};

const STUDENT_ID_HEADERS = new Set(["ID", "studentId", "아이디"]);
const META_HEADERS = new Set([
  "학년",
  "이름",
  "저장",
  "grade",
  "name",
  "studentName",
  "studentGrade",
]);

export const isEmptyEval = (v: unknown) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
};

/** CSV 라인 파싱 (쌍따옴표 처리) */
export const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
};

export const escapeCsvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export const parseEvaluationCsv = (
  text: string,
  editableLabels: Set<string>
): {
  rows: TEvaluationCsvRow[];
  ignoredHeaders: string[];
  evalHeaders: string[];
} => {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], ignoredHeaders: [], evalHeaders: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  let studentIdCol = -1;
  const gradeCol = headers.findIndex(
    (h) => h === "학년" || h === "studentGrade"
  );
  const nameCol = headers.findIndex(
    (h) => h === "이름" || h === "studentName" || h === "name"
  );
  const evalHeaders: string[] = [];
  const ignoredHeaders: string[] = [];

  headers.forEach((h, i) => {
    if (!h) return;
    if (STUDENT_ID_HEADERS.has(h)) {
      studentIdCol = i;
      return;
    }
    if (META_HEADERS.has(h)) {
      ignoredHeaders.push(h);
      return;
    }
    if (editableLabels.has(h)) {
      evalHeaders.push(h);
      return;
    }
    ignoredHeaders.push(h);
  });

  if (studentIdCol < 0) {
    return { rows: [], ignoredHeaders, evalHeaders };
  }

  const byId = new Map<string, TEvaluationCsvRow>();
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const studentId = (values[studentIdCol] ?? "").trim();
    if (!studentId) continue;

    const evaluation: Record<string, string> = {};
    headers.forEach((h, j) => {
      if (editableLabels.has(h)) {
        evaluation[h] = (values[j] ?? "").trim();
      }
    });
    byId.set(studentId, {
      studentId,
      studentGrade: gradeCol >= 0 ? (values[gradeCol] ?? "").trim() : "",
      studentName: nameCol >= 0 ? (values[nameCol] ?? "").trim() : "",
      evaluation,
    });
  }

  return {
    rows: Array.from(byId.values()),
    ignoredHeaders,
    evalHeaders,
  };
};

export const buildEvaluationCsv = (
  rows: Array<{
    studentId?: string;
    studentGrade?: string;
    studentName?: string;
    evaluation?: Record<string, unknown>;
  }>,
  labels: string[]
) => {
  const headers = ["학년", "이름", "ID", ...labels];
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    const evaluation = row.evaluation || {};
    const cells = [
      row.studentGrade ?? "",
      row.studentName ?? "",
      row.studentId ?? "",
      ...labels.map((label) => {
        const flat = (row as any)[`evaluation.${label}`];
        const nested = evaluation[label];
        return flat != null && String(flat) !== "" ? flat : nested ?? "";
      }),
    ];
    lines.push(cells.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
};

/**
 * 초안 CSV를 enrollment 행에 반영 (메모리만, DB 저장 없음)
 */
export const applyEvaluationCsvToEnrollments = (
  enrollments: any[],
  csv: string,
  options: {
    fillEmptyOnly?: boolean;
    editableLabels: string[];
  }
): TApplyEvaluationCsvResult => {
  const fillEmptyOnly = options.fillEmptyOnly !== false;
  const labelSet = new Set(options.editableLabels);
  const { rows } = parseEvaluationCsv(csv, labelSet);
  const byId = new Map(rows.map((r) => [r.studentId, r]));
  const unknownIds: string[] = [];
  let applied = 0;
  let skipped = 0;

  const seen = new Set<string>();
  const next = enrollments.map((enr) => {
    const sid = String(enr.studentId ?? "").trim();
    if (!sid) return enr;
    const draft = byId.get(sid);
    if (!draft) return enr;
    seen.add(sid);

    let changed = false;
    const evaluation = { ...(enr.evaluation || {}) };
    const patch: Record<string, any> = {};

    for (const label of options.editableLabels) {
      const csvVal = draft.evaluation[label];
      if (csvVal == null || String(csvVal).trim() === "") {
        skipped += 1;
        continue;
      }
      const current =
        evaluation[label] ?? enr[`evaluation.${label}`] ?? "";
      if (fillEmptyOnly && !isEmptyEval(current)) {
        skipped += 1;
        continue;
      }
      evaluation[label] = csvVal;
      patch[`evaluation.${label}`] = csvVal;
      changed = true;
      applied += 1;
    }

    if (!changed) return enr;
    return {
      ...enr,
      ...patch,
      evaluation,
      isModified: true,
    };
  });

  for (const row of rows) {
    if (!seen.has(row.studentId)) unknownIds.push(row.studentId);
  }

  return { applied, skipped, unknownIds, enrollments: next };
};
