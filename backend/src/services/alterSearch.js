/**
 * Alter 검색 스킬 — SQL 생성·실행·요약·시각화 코드
 */

import {
  generateText,
  resolveProvider,
  resolveModel,
} from "./aiProvider.js";
import { AI_ERRORS, FEATURE_PROFILES, truncateText } from "./aiPromptPolicy.js";
import { maskSensitiveText } from "./aiSafety.js";
import { logAIUsage } from "./aiUsage.js";
import {
  buildSearchCatalog,
  countCatalogTable,
  formatCatalogDdl,
  loadCatalogTables,
  peekSearchSchema,
} from "./alterSearchCatalog.js";
import {
  filterPushdownByDict,
  formatSearchSchemaHint,
  samePushdown,
} from "./alterSearchPeek.js";
import {
  canCountInMongo,
  extractPushdownFilters,
  normalizeSearchGrade,
  normalizeSeasonScope,
  parseSimpleCountTable,
} from "./alterSearchPushdown.js";
import {
  formatAggregateNote,
  formatFallbackTotals,
  summarizeNumericColumns,
} from "./alterSearchAgg.js";
import {
  SEARCH_STORE_CAP,
  assertSelectOnly,
  extractReferencedTables,
  runSelect,
} from "./alterSearchSql.js";

const SQL_FENCE = /```sql\s*([\s\S]*?)```/i;
const JS_FENCE = /```(?:javascript|js)\s*([\s\S]*?)```/i;

const VIZ_INTENT =
  /통계|차트|그래프|비율|시각|피벗|평균|분포|막대|파이|이 형태|코딩|코드로|집계/;

const mapProviderError = (err) => {
  if (err?.code === "AI_TIMEOUT" || err?.status === 504) {
    return AI_ERRORS.GENERATION_FAILED;
  }
  if (err?.status === 404) return AI_ERRORS.MODEL_NOT_FOUND;
  if (err?.status === 401 || err?.status === 403) return AI_ERRORS.INVALID_API_KEY;
  return AI_ERRORS.GENERATION_FAILED;
};

const mergeTokenUsage = (a, b) => {
  if (!b) return a || null;
  if (!a) return { ...b };
  return {
    promptTokens: (a.promptTokens || 0) + (b.promptTokens || 0),
    candidatesTokens: (a.candidatesTokens || 0) + (b.candidatesTokens || 0),
    thoughtsTokens: (a.thoughtsTokens || 0) + (b.thoughtsTokens || 0),
    totalTokens: (a.totalTokens || 0) + (b.totalTokens || 0),
  };
};

const extractFence = (text, re) => {
  const m = String(text || "").match(re);
  return m ? m[1].trim() : "";
};

const parseSqlFromText = (text) => {
  const fenced = extractFence(text, SQL_FENCE);
  if (fenced) return fenced;
  const stripped = String(text || "").trim();
  if (/^\s*select\b/i.test(stripped)) return stripped;
  return "";
};

const sampleRows = (rows, n = 24) =>
  (rows || []).slice(0, n).map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row || {})) {
      out[k] = maskSensitiveText(v == null ? "" : String(v)).text;
    }
    return out;
  });

const wantsViz = (message) => VIZ_INTENT.test(String(message || ""));

const buildSqlPrompt = ({
  ddl,
  message,
  guidelines,
  seasonNote,
  valueHint = "",
}) =>
  `당신은 학교 정보 시스템 Alter의 검색 도우미입니다.
권한 필터가 이미 적용된 가상 테이블만 사용할 수 있습니다. Mongo 쿼리나 쓰기는 하지 마세요.

${seasonNote}

## 스키마
${ddl}

${valueHint ? `${valueHint}\n` : ""}
${guidelines ? `## 학교 지침\n${guidelines}\n` : ""}
규칙:
- 반드시 하나의 SELECT만 작성합니다. INSERT/UPDATE/CREATE 금지.
- 스키마에 있는 테이블·컬럼만 사용합니다. 한글 컬럼은 큰따옴표로 감쌉니다.
- 결과는 최대 10000행입니다. 필요하면 LIMIT을 넣으세요.
- 추측 행을 만들지 마세요.
- 학기 범위는 이미 고정되어 있습니다. year/term으로 다시 좁히지 마세요.
- 질문에 학년·이름이 있으면 student_grade, grade, student_name 등호에 위 목록의 실제 값만 쓰세요. 없는 표기를 추측하지 마세요.
- enrollments와 enrollment_evaluations는 수강 1건입니다. 학생 수는 COUNT(DISTINCT student_id)입니다. COUNT(*)는 수강 건수입니다.
- 평가 항목은 펼쳐진 한글 열을 쓰세요. evaluation_json에서 없는 키(JSON_EXTRACT(..., '$.grade'))를 꺼내지 마세요.
- 보드 활동 항목 비율은 form_* 표의 한글 열을 쓰세요. answers_json에서 JSON_EXTRACT(..., '$.컴퓨터')처럼 키를 추측하지 마세요.
- 숫자 열(시간·점수 등)은 TEXT일 수 있습니다. 합계만 필요하면 SUM(CAST("시간" AS REAL))처럼 CAST 후 집계하세요. 목록이 필요하면 행을 SELECT하세요. 합·평균은 서버가 계산합니다.

사용자 질문:
${message}

응답은 \`\`\`sql 코드펜스 안에 SELECT만 넣으세요. 설명은 펜스 밖에 한 줄만.`;

const buildSummaryPrompt = ({
  message,
  sql,
  columns,
  rows,
  rowCount,
  truncated,
  wantViz,
  aggregateNote = "",
}) =>
  `검색 SQL이 실행되었습니다. 결과를 한국어로 짧게 설명하세요.
숫자는 결과에만 근거하고, 없는 사실은 추측하지 마세요.
합·평균·총 시간은 확정 계산이 있으면 그 값만 쓰세요. 표본을 다시 더하거나 어림하지 마세요.
민감정보(주민번호·연락처·주소)는 반복하지 마세요.

질문: ${message}

SQL:
${sql}

행 수: ${rowCount}${truncated ? " (저장·표시는 일부만)" : ""}
열: ${columns.join(", ")}
${aggregateNote ? `\n확정 계산:\n${aggregateNote}\n` : ""}
표본:
${JSON.stringify(sampleRows(rows), null, 2)}

${
  wantViz
    ? `사용자가 통계·차트·커스텀 출력을 원합니다. 이어서 \`\`\`js 펜스에
function render(rows) { /* rows: 객체 배열. document.body에 HTML을 그리세요 */ }
만 넣으세요. fetch·parent·eval·네트워크는 쓰지 마세요. rows만 사용하세요. 합계 숫자는 확정 계산을 쓰세요.`
    : "코드 펜스는 넣지 마세요."
}`;

const toDraft = ({ sql, columns, rows, vizCode, tableTruncated = false }) => {
  const stored = (rows || []).slice(0, SEARCH_STORE_CAP);
  return {
    kind: "search",
    sql: sql || "",
    columns: (columns || []).map((key) => ({ key, label: key })),
    rows: stored,
    rowCount: rows?.length || 0,
    truncated: tableTruncated || (rows?.length || 0) > stored.length,
    vizCode: vizCode ? String(vizCode).slice(0, 20000) : "",
  };
};

export const executeSearchSkill = async ({
  academyId,
  user,
  academy,
  season,
  school,
  registration,
  context = {},
  message = "",
  history = [],
  guidelines = "",
  onEvent,
}) => {
  const profile = FEATURE_PROFILES.search;
  const emit = typeof onEvent === "function" ? onEvent : () => {};
  const provider = resolveProvider(academy.aiProvider);
  const modelName = resolveModel(provider, academy.aiModel);
  let tokenUsage = null;

  const userQuestion = maskSensitiveText(String(message || "").trim()).text;
  if (!userQuestion) {
    const err = new Error("검색할 내용을 입력해 주세요.");
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    throw err;
  }

  emit("step", { message: "검색할 데이터 범위를 준비하는 중..." });
  const seasonScope = normalizeSeasonScope(context.seasonScope);
  const seasonId = String(context.seasonId || "").trim();
  const grade = normalizeSearchGrade(context.grade);
  const { specs, seasonIds, evalColumns, formTables, overflowFormTitles } =
    await buildSearchCatalog({
      academyId,
      user,
      school,
      season,
      registration,
      seasonScope,
      seasonId,
      grade,
    });
  const searchSchema = await peekSearchSchema({
    academyId,
    user,
    registration,
    seasonIds,
    grade,
    evalColumns,
    formTables,
    overflowFormTitles,
  });
  const valueHint = formatSearchSchemaHint(searchSchema, seasonScope);
  const ddl = formatCatalogDdl(specs);
  const allowedNames = specs.map((s) => s.name);
  const scopeLabel =
    seasonScope === "activated"
      ? "활성 학기 전부"
      : seasonScope === "season"
        ? "선택한 활성 학기"
        : `현재 학기 year=${JSON.stringify(
            season?.year || ""
          )} term=${JSON.stringify(season?.term || "")}`;
  const seasonNote = `범위: ${scopeLabel}${
    grade ? ` 학년=${JSON.stringify(grade)}` : ""
  }. 권한 있는 행만. year/term으로 다시 거르지 마세요. 학년·이름은 질문에 있으면 등호 조건으로 넣으세요.`;

  const recent = [];
  for (const m of (history || []).slice(-6)) {
    if (!m?.content) continue;
    recent.push({
      role: m.role === "assistant" ? "assistant" : "user",
      content: maskSensitiveText(String(m.content)).text.slice(0, 800),
    });
  }

  const runLlm = async (systemInstruction, userContent) => {
    const { text, tokenUsage: usage } = await generateText({
      provider,
      apiKey: academy.aiApiKey,
      model: modelName,
      systemInstruction,
      messages: [...recent, { role: "user", content: userContent }],
      temperature: profile.temperature,
      maxTokens: profile.maxTokens,
    });
    tokenUsage = mergeTokenUsage(tokenUsage, usage);
    return maskSensitiveText(text || "").text;
  };

  emit("step", { message: "검색 SQL을 작성하는 중..." });
  let sql = "";
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const hint = lastErr
      ? `\n이전 SQL 오류:\n${lastErr}\n고친 SELECT만 다시 작성하세요.`
      : "";
    let llmText = "";
    try {
      llmText = await runLlm(
        "검색 SQL만 작성합니다.",
        buildSqlPrompt({
          ddl,
          message: userQuestion,
          guidelines: truncateText(guidelines || "", 4000),
          seasonNote,
          valueHint,
        }) + hint
      );
    } catch (err) {
      if (!err.code) err.code = mapProviderError(err);
      logAIUsage(academyId, {
        user,
        provider,
        model: modelName,
        feature: profile.feature,
        success: false,
        errorCode: err.code,
        tokenUsage,
      });
      throw err;
    }
    sql = parseSqlFromText(llmText);
    try {
      sql = assertSelectOnly(sql);
      lastErr = "";
      break;
    } catch (e) {
      lastErr = e.message || "SQL이 올바르지 않습니다.";
      sql = "";
    }
  }

  if (!sql) {
    const err = new Error(
      lastErr || "검색 SQL을 만들지 못했습니다. 질문을 조금 더 구체적으로 적어 주세요."
    );
    err.status = 400;
    err.code = AI_ERRORS.GENERATION_FAILED;
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: false,
      errorCode: err.code,
      tokenUsage,
    });
    throw err;
  }

  const resolveTables = (sqlText) => {
    let tables = extractReferencedTables(sqlText, allowedNames);
    if (!tables.length) {
      tables = allowedNames.filter((name) => sqlText.includes(name));
    }
    if (!tables.length) {
      tables = ["enrollments", "syllabi", "registrations"].filter((n) =>
        allowedNames.includes(n)
      );
    }
    return tables;
  };

  const runLoadedSelect = async (sqlText) => {
    const tables = resolveTables(sqlText);
    const rawFilters = extractPushdownFilters(sqlText);
    const filtersByTable = filterPushdownByDict(rawFilters, searchSchema);
    const countTable = parseSimpleCountTable(sqlText);
    if (
      countTable &&
      canCountInMongo(sqlText, countTable) &&
      samePushdown(rawFilters[countTable], filtersByTable[countTable])
    ) {
      const spec = specs.find((s) => s.name === countTable);
      if (spec) {
        const n = await countCatalogTable(spec, {
          grade,
          mongoFilter: filtersByTable[countTable] || {},
        });
        return {
          loaded: [{ name: countTable, rows: n > 0 ? [{}] : [], truncated: false }],
          queryResult: {
            columns: ["count"],
            rows: [{ count: n }],
            rowCount: 1,
          },
          tableTruncated: false,
        };
      }
    }
    const loaded = await loadCatalogTables(specs, tables, {
      grade,
      filtersByTable,
    });
    if (!loaded.length) {
      const err = new Error("질문에 맞는 조회 가능한 표가 없습니다.");
      err.status = 400;
      err.code = AI_ERRORS.GENERATION_FAILED;
      throw err;
    }
    const result = await runSelect(sqlText, loaded);
    return {
      loaded,
      queryResult: result,
      tableTruncated: loaded.some((t) => t.truncated),
    };
  };

  emit("step", { message: "권한 있는 데이터를 조회하는 중..." });
  let queryResult = { columns: [], rows: [], rowCount: 0 };
  let tableTruncated = false;
  try {
    let ran = await runLoadedSelect(sql);
    queryResult = ran.queryResult;
    tableTruncated = ran.tableTruncated;
    const loadedHasRows = ran.loaded.some((t) => (t.rows || []).length > 0);
    if (queryResult.rowCount === 0 && loadedHasRows) {
      emit("step", { message: "조건이 저장값과 달라 검색 SQL을 다시 작성하는 중..." });
      const retryHint = `\n직전 SQL은 0건이었습니다. 범위 안에 있는 실제 값만 써서 SELECT를 다시 작성하세요. 없는 이름·연도를 추측하지 마세요.\n직전 SQL:\n${sql}`;
      const retryText = await runLlm(
        "검색 SQL만 작성합니다.",
        buildSqlPrompt({
          ddl,
          message: userQuestion,
          guidelines: truncateText(guidelines || "", 4000),
          seasonNote,
          valueHint,
        }) + retryHint
      );
      const retrySql = parseSqlFromText(retryText);
      if (retrySql) {
        sql = assertSelectOnly(retrySql);
        ran = await runLoadedSelect(sql);
        queryResult = ran.queryResult;
        tableTruncated = ran.tableTruncated;
      }
    }
  } catch (err) {
    if (err.code === "SEARCH_SQL_INVALID") {
      err.status = 400;
      err.code = AI_ERRORS.GENERATION_FAILED;
    }
    if (!err.code) {
      err.message = `SQL 실행에 실패했습니다: ${err.message}`;
      err.status = 400;
      err.code = AI_ERRORS.GENERATION_FAILED;
    }
    logAIUsage(academyId, {
      user,
      provider,
      model: modelName,
      feature: profile.feature,
      success: false,
      errorCode: err.code,
      tokenUsage,
    });
    throw err;
  }

  emit("step", { message: "검색 결과를 정리하는 중..." });
  const wantViz = wantsViz(userQuestion);
  const storedRows = (queryResult.rows || []).slice(0, SEARCH_STORE_CAP);
  const truncated =
    tableTruncated || (queryResult.rows?.length || 0) > storedRows.length;
  const aggregates = summarizeNumericColumns(queryResult.columns, storedRows);
  const aggregateNote = formatAggregateNote(aggregates, {
    rowCount: storedRows.length,
    truncated,
  });
  const fallbackSummary = queryResult.rowCount
    ? `${queryResult.rowCount}건을 찾았습니다.${formatFallbackTotals(aggregates)}`
    : "조건에 맞는 행이 없습니다.";
  let summary = "";
  let vizCode = "";
  try {
    const explained = await runLlm(
      "검색 결과를 설명합니다. 없는 숫자는 만들지 마세요. 합·평균은 확정 계산만 쓰세요.",
      buildSummaryPrompt({
        message: userQuestion,
        sql,
        columns: queryResult.columns,
        rows: queryResult.rows,
        rowCount: queryResult.rowCount,
        truncated,
        wantViz,
        aggregateNote,
      })
    );
    summary = explained.replace(SQL_FENCE, "").replace(JS_FENCE, "").trim();
    if (wantViz) vizCode = extractFence(explained, JS_FENCE);
  } catch (err) {
    summary = fallbackSummary;
  }

  if (!summary) {
    summary = fallbackSummary;
  }

  const draft = toDraft({
    sql,
    columns: queryResult.columns,
    rows: queryResult.rows,
    vizCode,
    tableTruncated,
  });

  logAIUsage(academyId, {
    user,
    provider,
    model: modelName,
    feature: profile.feature,
    success: true,
    tokenUsage,
  });

  return { text: summary, draft, tokenUsage };
};

export { buildSqlPrompt, buildSummaryPrompt };
