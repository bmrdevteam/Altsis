import { ReactNode } from "react";
import Svg from "assets/svg/Svg";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import bStyle from "pages/boards/boards.module.scss";
import aStyle from "pages/boards/altBoard/altBoard.module.scss";

export type TEvalColumnOption = {
  key: string;
  text: string;
};

type Props = {
  title?: string;
  count?: number;
  keyword: string;
  onKeywordChange: (value: string) => void;
  columns: TEvalColumnOption[];
  visibleKeys: Set<string>;
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onReset: () => void;
  /** 수업 보드가 있을 때 활동→평가 가져오기 */
  onImportFromBoard?: () => void;
  /** CSV 양식 다운로드 */
  onDownloadCsvTemplate?: () => void;
  /** CSV로 평가 가져오기 */
  onImportFromCsv?: () => void;
  children?: ReactNode;
};

const CHIP_TONES = [
  bStyle.filterChipToneOptional,
  bStyle.filterChipToneSubmitted,
  bStyle.filterChipToneScheduled,
  bStyle.filterChipToneApproval,
  bStyle.filterChipTonePending,
  bStyle.filterChipToneDirect,
];

/**
 * 평가 탭: 검색·필터 → 활동/문서와 동일한 섹션 헤더 → 본문
 */
const EvaluationToolbar = ({
  title = "평가",
  count,
  keyword,
  onKeywordChange,
  columns,
  visibleKeys,
  onToggle,
  onShowAll,
  onReset,
  onImportFromBoard,
  onDownloadCsvTemplate,
  onImportFromCsv,
  children,
}: Props) => {
  const allVisible =
    columns.length > 0 && columns.every((c) => visibleKeys.has(c.key));
  const hasFilter = !!keyword.trim() || (!allVisible && columns.length > 0);
  const hasActions =
    !!onDownloadCsvTemplate || !!onImportFromCsv || !!onImportFromBoard;

  return (
    <div className={aStyle.formList}>
      <div className={bStyle.activityFilterBlock}>
        <div className={mergeStyle.mergeSearchBar}>
          <div className={mergeStyle.mergeSearchInputWrap}>
            <span className={mergeStyle.mergeSearchIcon}>
              <Svg type="search" width="18px" height="18px" />
            </span>
            <input
              className={mergeStyle.mergeSearchInput}
              type="search"
              placeholder="이름, ID, 학년 검색"
              value={keyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              aria-label="평가 학생 검색"
            />
          </div>
        </div>

        {columns.length > 0 && (
          <div
            className={bStyle.filterChipRow}
            role="group"
            aria-label="평가 항목 보기"
          >
            <button
              type="button"
              className={`${bStyle.filterChip} ${bStyle.filterChipToneAll} ${
                allVisible ? bStyle.filterChipActive : ""
              }`}
              aria-pressed={allVisible}
              onClick={onShowAll}
            >
              <span className={bStyle.filterChipIcon} aria-hidden>
                <Svg type="list" width="12px" height="12px" />
              </span>
              전체
            </button>

            {columns.map((col, i) => {
              const active = visibleKeys.has(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  className={`${bStyle.filterChip} ${
                    CHIP_TONES[i % CHIP_TONES.length]
                  } ${active ? bStyle.filterChipActive : ""}`}
                  aria-pressed={active}
                  onClick={() => onToggle(col.key)}
                >
                  {col.text}
                </button>
              );
            })}

            {hasFilter && (
              <button
                type="button"
                className={bStyle.filterChipReset}
                onClick={onReset}
              >
                초기화
              </button>
            )}
          </div>
        )}
      </div>

      <section className={aStyle.formSectionPanel}>
        <div className={aStyle.formSectionHeaderStatic}>
          <div className={aStyle.formSectionHeaderMain}>
            <h3 className={aStyle.formSectionTitle}>{title}</h3>
            {typeof count === "number" && (
              <span className={aStyle.formSectionCount}>{count}</span>
            )}
          </div>
          {hasActions && (
            <div className={aStyle.formListToolbar} style={{ gap: 8 }}>
              {onDownloadCsvTemplate && (
                <button
                  type="button"
                  className={`${bStyle.filterChip} ${bStyle.filterChipToneScheduled}`}
                  onClick={onDownloadCsvTemplate}
                >
                  CSV 양식 다운로드
                </button>
              )}
              {onImportFromCsv && (
                <button
                  type="button"
                  className={`${bStyle.filterChip} ${bStyle.filterChipToneOptional}`}
                  onClick={onImportFromCsv}
                >
                  CSV 가져오기
                </button>
              )}
              {onImportFromBoard && (
                <button
                  type="button"
                  className={`${bStyle.filterChip} ${bStyle.filterChipToneDirect}`}
                  onClick={onImportFromBoard}
                >
                  활동에서 가져오기
                </button>
              )}
            </div>
          )}
        </div>
        {children != null && (
          <div className={aStyle.formSectionBody}>{children}</div>
        )}
      </section>
    </div>
  );
};

export default EvaluationToolbar;
