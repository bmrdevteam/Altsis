/**
 * MergeEngine
 * @description Alt Docs 머지 템플릿 파싱 및 렌더링
 *
 * 문법:
 *   {{#sheet 시트명}}          — 사용할 시트 선언 (문서 상단)
 *   {{변수}}                   — 단일 값 치환 (필드 label 기준)
 *   {{_respondentName}}        — 응답자 이름
 *   {{_count}}                 — 행 개수
 *   {{#each}}...{{/each}}      — 모든 행 반복
 *   {{#table col1, col2, ...}} — 마크다운 테이블 생성
 */

/**
 * 템플릿에서 시트명 추출
 * @param {string} content - 게시글 content
 * @returns {{ sheetName: string|null, body: string }}
 */
export function parseSheetDeclaration(content) {
  const match = content.match(/\{\{#sheet\s+(.+?)\}\}/);
  if (!match) {
    return { sheetName: null, body: content };
  }
  const sheetName = match[1].trim();
  const body = content.replace(match[0], "").trim();
  return { sheetName, body };
}

/**
 * 필드 label → fieldId 매핑 생성
 * @param {Array} fields - AltForm.fields
 * @returns {Map<string, string>} label → fieldId
 */
function buildLabelMap(fields) {
  const map = new Map();
  for (const field of fields) {
    map.set(field.label, field._id.toString());
  }
  return map;
}

/**
 * 단일 행에서 변수 치환
 * @param {string} template - 텍스트
 * @param {Object} row - AltSheetRow (data Map 포함)
 * @param {Map} labelMap - label → fieldId
 * @returns {string}
 */
function replaceVariables(template, row, labelMap) {
  return template.replace(/\{\{(.+?)\}\}/g, (match, varName) => {
    const trimmed = varName.trim();

    // 시스템 변수
    if (trimmed === "_respondentName") return row._respondentName || "";
    if (trimmed === "_respondentId") return row._respondentId || "";
    if (trimmed === "_submittedAt") return row._submittedAt || "";
    if (trimmed === "_updatedAt") return row._updatedAt || "";

    // 필드 label로 조회
    const fieldId = labelMap.get(trimmed);
    if (fieldId && row.data) {
      const value = row.data instanceof Map ? row.data.get(fieldId) : row.data[fieldId];
      return value !== undefined && value !== null ? String(value) : "";
    }

    return match; // 매칭 안 되면 원본 유지
  });
}

/**
 * 머지 렌더링
 * @param {string} body - 시트 선언 제거 후 본문
 * @param {Array} rows - AltSheetRow 배열
 * @param {Array} fields - AltForm.fields
 * @returns {string} 렌더링된 문자열
 */
export function renderMerge(body, rows, fields) {
  const labelMap = buildLabelMap(fields);

  // {{_count}} 치환
  let result = body.replace(/\{\{_count\}\}/g, String(rows.length));

  // {{#table col1, col2, ...}} 처리
  result = result.replace(
    /\{\{#table\s+(.+?)\}\}/g,
    (match, colList) => {
      const cols = colList.split(",").map((c) => c.trim());
      if (rows.length === 0) return "(데이터 없음)";

      // 헤더
      let table = "| " + cols.join(" | ") + " |\n";
      table += "| " + cols.map(() => "---").join(" | ") + " |\n";

      // 행
      for (const row of rows) {
        const cells = cols.map((col) => {
          if (col === "_respondentName") return row._respondentName || "";
          if (col === "_respondentId") return row._respondentId || "";
          const fieldId = labelMap.get(col);
          if (fieldId && row.data) {
            const value = row.data instanceof Map ? row.data.get(fieldId) : row.data[fieldId];
            return value !== undefined && value !== null ? String(value) : "";
          }
          return "";
        });
        table += "| " + cells.join(" | ") + " |\n";
      }

      return table;
    }
  );

  // {{#each}}...{{/each}} 처리
  result = result.replace(
    /\{\{#each\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (match, inner) => {
      if (rows.length === 0) return "";
      return rows.map((row) => replaceVariables(inner, row, labelMap)).join("");
    }
  );

  // 나머지 단일 변수 치환 (첫 행 기준)
  if (rows.length > 0) {
    result = replaceVariables(result, rows[0], labelMap);
  }

  return result;
}
