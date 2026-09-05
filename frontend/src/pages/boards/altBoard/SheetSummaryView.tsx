import { Ref, useCallback, useMemo, useState } from "react";
import style from "./altBoard.module.scss";
import { TAltForm, TAltFormField } from "types/altForm";
import { TAltSheetRow } from "types/altSheet";
import {
  buildSheetSummary,
  TSummaryBarItem,
} from "./sheetSummary";
import { NO_PRINT_CLASS } from "utils/printArea";

type Props = {
  form: TAltForm;
  rows: TAltSheetRow[];
  visibleFields: TAltFormField[];
  canManage: boolean;
  printRootRef?: Ref<HTMLDivElement>;
  printTitle?: string;
};

type TChartType = "bar" | "pie";

/** 선명한 차트 팔레트 (구글 설문지 계열, SCSS --sheet-chart-N) */
const CHART_COLOR_VARS = [
  "var(--sheet-chart-1)",
  "var(--sheet-chart-2)",
  "var(--sheet-chart-3)",
  "var(--sheet-chart-4)",
  "var(--sheet-chart-5)",
  "var(--sheet-chart-6)",
  "var(--sheet-chart-7)",
  "var(--sheet-chart-8)",
] as const;

const chartColor = (index: number) =>
  CHART_COLOR_VARS[index % CHART_COLOR_VARS.length];

const pctOf = (count: number, total: number) =>
  total > 0 ? Math.round((count / total) * 1000) / 10 : 0;

const defaultChartType = (bars: TSummaryBarItem[]): TChartType => {
  const nonZero = bars.filter((b) => b.count > 0).length;
  return nonZero >= 1 && nonZero <= 5 ? "pie" : "bar";
};

const buildConicGradient = (bars: TSummaryBarItem[], total: number) => {
  if (total <= 0) return "var(--background-color-2)";
  let acc = 0;
  const parts: string[] = [];
  bars.forEach((bar, i) => {
    if (bar.count <= 0) return;
    const start = (acc / total) * 360;
    acc += bar.count;
    const end = (acc / total) * 360;
    parts.push(`${chartColor(i)} ${start}deg ${end}deg`);
  });
  return parts.length > 0
    ? `conic-gradient(${parts.join(", ")})`
    : "var(--background-color-2)";
};

const ChartTypeToggle = ({
  value,
  onChange,
}: {
  value: TChartType;
  onChange: (next: TChartType) => void;
}) => (
  <div
    className={`${style.sheetSummaryChartToggle} ${style.noPrint} ${NO_PRINT_CLASS}`}
    role="group"
    aria-label="차트 종류"
  >
    <button
      type="button"
      className={`${style.sheetSummaryChartToggleBtn} ${
        value === "bar" ? style.sheetSummaryChartToggleBtnActive : ""
      }`}
      aria-pressed={value === "bar"}
      onClick={() => onChange("bar")}
    >
      막대
    </button>
    <button
      type="button"
      className={`${style.sheetSummaryChartToggleBtn} ${
        value === "pie" ? style.sheetSummaryChartToggleBtnActive : ""
      }`}
      aria-pressed={value === "pie"}
      onClick={() => onChange("pie")}
    >
      원형
    </button>
  </div>
);

const SummaryChart = ({
  bars,
  total,
  chartType,
}: {
  bars: TSummaryBarItem[];
  total: number;
  chartType: TChartType;
}) => {
  if (bars.length === 0) {
    return (
      <div className={style.sheetSummaryEmptyHint}>집계할 값이 없습니다.</div>
    );
  }

  const pieBars = bars.filter((b) => b.count > 0);
  const pieTotal = pieBars.reduce((s, b) => s + b.count, 0) || total;

  if (chartType === "pie" && pieTotal > 0) {
    return (
      <div className={style.sheetSummaryPieWrap}>
        <div
          className={style.sheetSummaryPie}
          style={{ background: buildConicGradient(pieBars, pieTotal) }}
          role="img"
          aria-label={pieBars
            .map((b) => `${b.label} ${pctOf(b.count, pieTotal)}%`)
            .join(", ")}
        />
        <ul className={style.sheetSummaryPieLegend}>
          {pieBars.map((bar, i) => {
            const pct = pctOf(bar.count, pieTotal);
            return (
              <li key={bar.key} className={style.sheetSummaryPieLegendItem}>
                <span
                  className={style.sheetSummaryPieSwatch}
                  style={{ background: chartColor(i) }}
                  aria-hidden
                />
                <span
                  className={style.sheetSummaryPieLegendLabel}
                  title={bar.label}
                >
                  {bar.label}
                </span>
                <span className={style.sheetSummaryPieLegendValue}>
                  {bar.count} ({pct}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (chartType === "pie" && pieTotal <= 0) {
    return (
      <div className={style.sheetSummaryEmptyHint}>집계할 값이 없습니다.</div>
    );
  }

  const maxCount = Math.max(...bars.map((b) => b.count), 1);
  return (
    <div className={style.sheetSummaryBarChart}>
      {bars.map((bar, i) => {
        const pct = pctOf(bar.count, total);
        const fillWidth = Math.round((bar.count / maxCount) * 100);
        return (
          <div key={bar.key} className={style.sheetSummaryBarRow}>
            <div className={style.sheetSummaryBarRowTop}>
              <span className={style.sheetSummaryBarLabel} title={bar.label}>
                <span
                  className={style.sheetSummaryBarSwatch}
                  style={{ background: chartColor(i) }}
                  aria-hidden
                />
                {bar.label}
              </span>
              <span className={style.sheetSummaryBarValue}>
                {bar.count}
                {total > 0 ? ` (${pct}%)` : ""}
              </span>
            </div>
            <div className={style.sheetSummaryBarTrack}>
              <div
                className={style.sheetSummaryBarFill}
                style={{
                  width: `${fillWidth}%`,
                  background: chartColor(i),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TextList = ({
  texts,
  answerCount,
}: {
  texts: string[];
  answerCount: number;
}) => {
  const [open, setOpen] = useState(false);
  if (answerCount === 0) {
    return <div className={style.sheetSummaryEmptyHint}>응답이 없습니다.</div>;
  }
  return (
    <div className={style.sheetSummaryTextBlock}>
      <button
        type="button"
        className={style.sheetSummaryTextToggle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "응답 숨기기" : `응답 ${answerCount}개 보기`}
      </button>
      {open && (
        <ul className={style.sheetSummaryTextList}>
          {texts.map((t, i) => (
            <li
              key={`${i}_${t.slice(0, 24)}`}
              className={style.sheetSummaryTextItem}
            >
              {t}
            </li>
          ))}
          {answerCount > texts.length && (
            <li className={style.sheetSummaryTextMore}>
              외 {answerCount - texts.length}개…
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

const SheetSummaryView = ({
  form,
  rows,
  visibleFields,
  canManage,
  printRootRef,
  printTitle,
}: Props) => {
  const summary = useMemo(
    () =>
      buildSheetSummary({
        form,
        rows,
        fields: visibleFields,
        includeAssessment: canManage,
      }),
    [form, rows, visibleFields, canManage]
  );

  const [chartTypes, setChartTypes] = useState<Record<string, TChartType>>({});

  const resolveChartType = useCallback(
    (key: string, bars: TSummaryBarItem[]): TChartType =>
      chartTypes[key] ?? defaultChartType(bars),
    [chartTypes]
  );

  const setChartType = (key: string, next: TChartType) => {
    setChartTypes((prev) => ({ ...prev, [key]: next }));
  };

  if (rows.length === 0) {
    return <div className={style.sheetEmpty}>표시할 응답이 없습니다.</div>;
  }

  return (
    <div ref={printRootRef} className={style.sheetSummary}>
      {printTitle ? (
        <div className={style.printTitle}>{printTitle}</div>
      ) : null}

      <div className={style.sheetSummaryMeta}>
        전체 응답 {summary.totalRows}개
      </div>

      {summary.quiz && (
        <section className={style.sheetSummaryCard}>
          <div className={style.sheetSummaryCardHeader}>
            <h3 className={style.sheetSummaryCardTitle}>퀴즈 점수</h3>
            <div className={style.sheetSummaryCardHeaderRight}>
              <span className={style.sheetSummaryCardCount}>
                응답 {summary.quiz.answered}개
              </span>
              <ChartTypeToggle
                value={resolveChartType("quiz", summary.quiz.bars)}
                onChange={(next) => setChartType("quiz", next)}
              />
            </div>
          </div>
          <div className={style.sheetSummaryAverage}>
            <span className={style.sheetSummaryAverageNumber}>
              {summary.quiz.average.toFixed(1)}
            </span>
            <span className={style.sheetSummaryAverageLabel}>
              {summary.quiz.max != null
                ? `/ ${summary.quiz.max}점 평균`
                : "점 평균"}
            </span>
          </div>
          <SummaryChart
            bars={summary.quiz.bars}
            total={summary.quiz.answered}
            chartType={resolveChartType("quiz", summary.quiz.bars)}
          />
        </section>
      )}

      {summary.assessment && (
        <section className={style.sheetSummaryCard}>
          <div className={style.sheetSummaryCardHeader}>
            <h3 className={style.sheetSummaryCardTitle}>평가 현황</h3>
            {summary.assessment.scoreBars.length > 0 && (
              <div className={style.sheetSummaryCardHeaderRight}>
                <ChartTypeToggle
                  value={resolveChartType(
                    "assessment",
                    summary.assessment.scoreBars
                  )}
                  onChange={(next) => setChartType("assessment", next)}
                />
              </div>
            )}
          </div>
          <div className={style.sheetSummaryStatusRow}>
            <span>확정 {summary.assessment.finalized}</span>
            <span>초안 {summary.assessment.draft}</span>
            <span>미채점 {summary.assessment.ungraded}</span>
          </div>
          {summary.assessment.averageScore != null && (
            <div className={style.sheetSummaryAverage}>
              <span className={style.sheetSummaryAverageNumber}>
                {summary.assessment.averageScore.toFixed(1)}
              </span>
              <span className={style.sheetSummaryAverageLabel}>
                {summary.assessment.averageMax != null
                  ? `/ ${summary.assessment.averageMax.toFixed(0)}점 평균 (확정)`
                  : "점 평균 (확정)"}
              </span>
            </div>
          )}
          {summary.assessment.scoreBars.length > 0 && (
            <SummaryChart
              bars={summary.assessment.scoreBars}
              total={summary.assessment.finalized}
              chartType={resolveChartType(
                "assessment",
                summary.assessment.scoreBars
              )}
            />
          )}
        </section>
      )}

      {summary.fields.map((field) => {
        const fieldKey = `field:${field.fieldId}`;
        const fieldBars = field.bars || [];
        return (
          <section key={field.fieldId} className={style.sheetSummaryCard}>
            <div className={style.sheetSummaryCardHeader}>
              <h3 className={style.sheetSummaryCardTitle}>{field.label}</h3>
              <div className={style.sheetSummaryCardHeaderRight}>
                <span className={style.sheetSummaryCardCount}>
                  응답 {field.answerCount}개
                </span>
                {field.kind === "bars" && (
                  <ChartTypeToggle
                    value={resolveChartType(fieldKey, fieldBars)}
                    onChange={(next) => setChartType(fieldKey, next)}
                  />
                )}
              </div>
            </div>

            {field.average != null && (
              <div className={style.sheetSummaryAverage}>
                <span className={style.sheetSummaryAverageNumber}>
                  {field.average.toFixed(1)}
                </span>
                <span className={style.sheetSummaryAverageLabel}>평균</span>
              </div>
            )}

            {field.kind === "bars" && (
              <SummaryChart
                bars={fieldBars}
                total={field.answerCount}
                chartType={resolveChartType(fieldKey, fieldBars)}
              />
            )}
            {field.kind === "list" && (
              <TextList
                texts={field.texts || []}
                answerCount={field.answerCount}
              />
            )}

            {field.assessment && (
              <div className={style.sheetSummaryAssessmentBlock}>
                <div className={style.sheetSummaryAssessmentTitle}>평가 요약</div>
                {field.assessment.method === "manual_score" && (
                  <>
                    {field.assessment.scoreAverage != null && (
                      <div className={style.sheetSummaryAverage}>
                        <span className={style.sheetSummaryAverageNumber}>
                          {field.assessment.scoreAverage.toFixed(1)}
                        </span>
                        <span className={style.sheetSummaryAverageLabel}>
                          점 평균 (확정)
                        </span>
                      </div>
                    )}
                    <div className={style.sheetSummarySubChartHeader}>
                      <ChartTypeToggle
                        value={resolveChartType(
                          `${fieldKey}:score`,
                          field.assessment.scoreBars || []
                        )}
                        onChange={(next) =>
                          setChartType(`${fieldKey}:score`, next)
                        }
                      />
                    </div>
                    <SummaryChart
                      bars={field.assessment.scoreBars || []}
                      total={
                        (field.assessment.scoreBars || []).reduce(
                          (s, b) => s + b.count,
                          0
                        ) || 0
                      }
                      chartType={resolveChartType(
                        `${fieldKey}:score`,
                        field.assessment.scoreBars || []
                      )}
                    />
                  </>
                )}
                {field.assessment.method === "rubric" &&
                  (field.assessment.rubricGroups || []).map((group) => {
                    const rubricKey = `${fieldKey}:rubric:${group.rubricId}`;
                    return (
                      <div
                        key={group.rubricId}
                        className={style.sheetSummaryRubricGroup}
                      >
                        <div className={style.sheetSummarySubChartHeader}>
                          <div className={style.sheetSummaryRubricTitle}>
                            {group.rubricTitle}
                          </div>
                          <ChartTypeToggle
                            value={resolveChartType(rubricKey, group.bars)}
                            onChange={(next) => setChartType(rubricKey, next)}
                          />
                        </div>
                        <SummaryChart
                          bars={group.bars}
                          total={
                            group.bars.reduce((s, b) => s + b.count, 0) || 0
                          }
                          chartType={resolveChartType(rubricKey, group.bars)}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default SheetSummaryView;
