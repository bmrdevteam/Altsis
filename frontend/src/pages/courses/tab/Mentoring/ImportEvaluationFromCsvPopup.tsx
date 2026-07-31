import { useMemo, useRef, useState } from "react";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Popup from "components/popup/Popup";
import Button from "components/button/Button";
import { TFormEvaluation } from "types/seasons";

const STUDENT_ID_HEADERS = new Set(["ID", "studentId", "아이디"]);
const META_HEADERS = new Set(["학년", "이름", "저장", "grade", "name", "studentName", "studentGrade"]);

type ParsedRow = {
  studentId: string;
  evaluation: Record<string, string>;
};

type PreviewStats = {
  matchedRows: number;
  willFill: number;
  keepExisting: number;
  unknownIds: string[];
  ignoredHeaders: string[];
  noValue: number;
};

type Props = {
  syllabusId: string;
  enrollments: {
    studentId?: string;
    evaluation?: Record<string, unknown>;
  }[];
  setState: (open: boolean) => void;
  onImported: () => void;
};

const isEmptyEval = (v: unknown) => {
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
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
};

export const parseEvaluationCsv = (
  text: string,
  editableLabels: Set<string>
): {
  rows: ParsedRow[];
  ignoredHeaders: string[];
  evalHeaders: string[];
} => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], ignoredHeaders: [], evalHeaders: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  let studentIdCol = -1;
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

  /** 동일 studentId는 마지막 행 우선 */
  const byId = new Map<string, ParsedRow>();
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
    byId.set(studentId, { studentId, evaluation });
  }

  return {
    rows: Array.from(byId.values()),
    ignoredHeaders,
    evalHeaders,
  };
};

const ImportEvaluationFromCsvPopup = ({
  syllabusId,
  enrollments,
  setState,
  onImported,
}: Props) => {
  const { currentSeason, currentRegistration } = useAuth();
  const { SyllabusAPI } = useAPIv2();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formEvaluation: TFormEvaluation =
    (currentRegistration?.formEvaluation as TFormEvaluation) ||
    currentSeason?.formEvaluation ||
    [];

  const editableEvalLabels = useMemo(
    () =>
      formEvaluation
        .filter((item) => item.auth?.edit?.teacher)
        .map((item) => item.label),
    [formEvaluation]
  );

  const editableLabelSet = useMemo(
    () => new Set(editableEvalLabels),
    [editableEvalLabels]
  );

  const enrollmentByStudentId = useMemo(() => {
    const map = new Map<string, { evaluation?: Record<string, unknown> }>();
    for (const e of enrollments) {
      const sid = String(e.studentId ?? "").trim();
      if (sid) map.set(sid, e);
    }
    return map;
  }, [enrollments]);

  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [preview, setPreview] = useState<PreviewStats | null>(null);
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const buildPreview = (rows: ParsedRow[], ignoredHeaders: string[]) => {
    let matchedRows = 0;
    let willFill = 0;
    let keepExisting = 0;
    let noValue = 0;
    const unknownIds: string[] = [];

    for (const row of rows) {
      const enr = enrollmentByStudentId.get(row.studentId);
      if (!enr) {
        unknownIds.push(row.studentId);
        continue;
      }
      matchedRows += 1;
      for (const label of editableEvalLabels) {
        const csvVal = row.evaluation[label];
        if (csvVal == null || String(csvVal).trim() === "") {
          noValue += 1;
          continue;
        }
        if (!isEmptyEval(enr.evaluation?.[label])) {
          keepExisting += 1;
          continue;
        }
        willFill += 1;
      }
    }

    setPreview({
      matchedRows,
      willFill,
      keepExisting,
      unknownIds,
      ignoredHeaders,
      noValue,
    });
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setParseError("");
    setParsedRows([]);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text) {
        setParseError("파일을 읽을 수 없습니다.");
        return;
      }

      const { rows, ignoredHeaders } = parseEvaluationCsv(
        text,
        editableLabelSet
      );
      if (rows.length === 0) {
        setParseError(
          "유효한 행이 없습니다. 첫 행에 ID(또는 studentId) 열이 있는지 확인하세요."
        );
        return;
      }
      setParsedRows(rows);
      buildPreview(rows, ignoredHeaders);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      alert("CSV 파일을 선택해주세요.");
      return;
    }
    if (!preview || preview.willFill === 0) {
      alert("채울 빈 칸이 없습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await SyllabusAPI.ImportEvaluationFromCsv({
        params: { _id: syllabusId },
        data: {
          rows: parsedRows.map((r) => ({
            studentId: r.studentId,
            evaluation: r.evaluation,
          })),
        },
      });
      alert(
        [
          "가져오기 완료",
          `채움: ${result.filled}`,
          `기존 유지: ${result.skippedExisting}`,
          `값 없음: ${result.skippedNoValue}`,
          `알 수 없는 ID: ${result.skippedUnknownStudent}`,
          `알 수 없는 열: ${result.skippedUnknownLabel}`,
        ].join("\n")
      );
      setState(false);
      onImported();
    } catch (err) {
      ALERT_ERROR(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popup
      title="CSV로 평가 가져오기"
      setState={setState}
      closeBtn
      style={{ maxWidth: 560, width: "100%" }}
      contentScroll
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button type="ghost" onClick={() => setState(false)} disabled={submitting}>
            취소
          </Button>
          <Button
            type="ghost"
            onClick={handleImport}
            disabled={submitting || !preview || preview.willFill === 0}
          >
            {submitting ? "가져오는 중..." : "빈 칸만 채우기"}
          </Button>
        </div>
      }
    >
      <div style={{ padding: "4px 0 8px", lineHeight: 1.5 }}>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-color-2)",
            marginBottom: 16,
          }}
        >
          CSV의 평가값을 <strong>비어 있는 칸</strong>에만 넣습니다. 이미 입력된
          평가는 바뀌지 않습니다. ID 열로 학생을 매칭합니다.
        </p>

        {editableEvalLabels.length === 0 ? (
          <div style={{ color: "var(--text-color-2)", fontSize: 13 }}>
            교사 편집이 가능한 평가 항목이 없습니다.
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              style={{ display: "none" }}
              onChange={handleFile}
            />
            <Button
              type="ghost"
              onClick={() => fileInputRef.current?.click()}
              style={{ marginBottom: 12 }}
            >
              CSV 파일 선택
            </Button>
            {fileName && (
              <div
                style={{
                  fontSize: 13,
                  marginBottom: 12,
                  color: "var(--text-color)",
                }}
              >
                선택: {fileName}
              </div>
            )}
            {parseError && (
              <div style={{ color: "var(--color-red)", fontSize: 13 }}>
                {parseError}
              </div>
            )}
            {preview && (
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-color-2)",
                  background: "var(--background-color-2)",
                  borderRadius: 6,
                  padding: "12px 14px",
                }}
              >
                <div>매칭된 학생: {preview.matchedRows}명</div>
                <div>채울 칸(예상): {preview.willFill}</div>
                <div>기존 유지(예상): {preview.keepExisting}</div>
                <div>CSV 값 없음: {preview.noValue}</div>
                {preview.unknownIds.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    알 수 없는 ID ({preview.unknownIds.length}):{" "}
                    {preview.unknownIds.slice(0, 8).join(", ")}
                    {preview.unknownIds.length > 8 ? "…" : ""}
                  </div>
                )}
                {preview.ignoredHeaders.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    무시된 열: {preview.ignoredHeaders.join(", ")}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Popup>
  );
};

export default ImportEvaluationFromCsvPopup;
