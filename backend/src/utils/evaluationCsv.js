/**
 * 평가 CSV 파서/빌더 (Alter evaluation-draft Skill용)
 */

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

export const isEmptyEval = (v) => {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
};

/** CSV 라인 파싱 (쌍따옴표 처리) */
export const parseCsvLine = (line) => {
  const result = [];
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

export const escapeCsvCell = (v) => {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/**
 * @param {string} text
 * @param {Set<string>|string[]} [allowedLabels] - 평가 열로 인정할 label (없으면 ID·메타 제외 전부)
 */
export const parseEvaluationCsv = (text, allowedLabels) => {
  const labelSet =
    allowedLabels instanceof Set
      ? allowedLabels
      : allowedLabels
        ? new Set(allowedLabels)
        : null;

  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], ignoredHeaders: [], evalHeaders: [], headers: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  let studentIdCol = -1;
  const gradeCol = headers.findIndex((h) => h === "학년" || h === "studentGrade");
  const nameCol = headers.findIndex(
    (h) => h === "이름" || h === "studentName" || h === "name"
  );
  const evalHeaders = [];
  const ignoredHeaders = [];

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
    if (!labelSet || labelSet.has(h)) {
      evalHeaders.push(h);
      return;
    }
    ignoredHeaders.push(h);
  });

  if (studentIdCol < 0) {
    return { rows: [], ignoredHeaders, evalHeaders, headers };
  }

  /** @type {Map<string, object>} */
  const byId = new Map();
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const studentId = (values[studentIdCol] ?? "").trim();
    if (!studentId) continue;

    const evaluation = {};
    headers.forEach((h, j) => {
      if (evalHeaders.includes(h)) {
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
    headers,
  };
};

/**
 * @param {object[]} rows - { studentId, studentGrade?, studentName?, evaluation|values }
 * @param {string[]} labels - 포함할 평가 열
 */
export const buildEvaluationCsv = (rows, labels) => {
  const headers = ["학년", "이름", "ID", ...(labels || [])];
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows || []) {
    const values = row.values || row.evaluation || {};
    const cells = [
      row.studentGrade ?? "",
      row.studentName ?? "",
      row.studentId ?? "",
      ...(labels || []).map((label) => values[label] ?? ""),
    ];
    lines.push(cells.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
};
