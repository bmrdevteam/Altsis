import Svg from "assets/svg/Svg";
import mergeStyle from "components/mergeFilter/mergeFilter.module.scss";
import CollapsibleFilterBar from "../CollapsibleFilterBar";
import bStyle from "../boards.module.scss";

/** 배타 칩: 전체("") | 안 읽음 | 공지 | 비공개 */
export type TDocsViewFilter = "" | "unread" | "pinned" | "draft";

export type TDocsViewCounts = Record<Exclude<TDocsViewFilter, "">, number>;

const CHIP_TONE_CLASS: Record<string, string> = {
  All: bStyle.filterChipToneAll,
  Approval: bStyle.filterChipToneApproval,
  Optional: bStyle.filterChipToneOptional,
  Draft: bStyle.filterChipToneDraft,
};

const CHIP_VISUAL: Record<
  Exclude<TDocsViewFilter, "">,
  { label: string; icon: string; tone: string }
> = {
  unread: { label: "안 읽음", icon: "time", tone: "Approval" },
  pinned: { label: "공지", icon: "list", tone: "Optional" },
  draft: { label: "비공개", icon: "settings", tone: "Draft" },
};

const CHIP_ORDER: Exclude<TDocsViewFilter, "">[] = [
  "unread",
  "pinned",
  "draft",
];

type Props = {
  keyword: string;
  onKeywordChange: (value: string) => void;
  viewFilter: TDocsViewFilter;
  onViewFilterChange: (value: TDocsViewFilter) => void;
  counts: TDocsViewCounts;
  onClear: () => void;
  open: boolean;
};

const ChipIcon = ({ type }: { type: string }) => (
  <span className={bStyle.filterChipIcon} aria-hidden>
    <Svg type={type} width="12px" height="12px" />
  </span>
);

const DocsListFilterBar = ({
  keyword,
  onKeywordChange,
  viewFilter,
  onViewFilterChange,
  counts,
  onClear,
  open,
}: Props) => {
  const hasAnyFilter = !!keyword.trim() || !!viewFilter;

  return (
    <CollapsibleFilterBar open={open}>
      <div className={mergeStyle.mergeSearchBar}>
        <div className={mergeStyle.mergeSearchInputWrap}>
          <span className={mergeStyle.mergeSearchIcon}>
            <Svg type="search" width="18px" height="18px" />
          </span>
          <input
            className={mergeStyle.mergeSearchInput}
            type="search"
            placeholder="키워드 검색 (제목, 작성자)"
            value={keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
          />
        </div>
      </div>

      <div
        className={bStyle.filterChipRow}
        role="radiogroup"
        aria-label="문서 보기"
      >
        <button
          type="button"
          className={`${bStyle.filterChip} ${CHIP_TONE_CLASS.All} ${
            viewFilter === "" ? bStyle.filterChipActive : ""
          }`}
          aria-pressed={viewFilter === ""}
          onClick={() => onViewFilterChange("")}
        >
          <ChipIcon type="list" />
          전체
        </button>
        {CHIP_ORDER.map((value) => {
          const chip = CHIP_VISUAL[value];
          const count = counts[value] || 0;
          if (count <= 0) return null;
          const active = viewFilter === value;
          return (
            <button
              key={value}
              type="button"
              className={`${bStyle.filterChip} ${CHIP_TONE_CLASS[chip.tone]} ${
                active ? bStyle.filterChipActive : ""
              }`}
              aria-pressed={active}
              onClick={() => onViewFilterChange(value)}
            >
              <ChipIcon type={chip.icon} />
              {chip.label} {count}
            </button>
          );
        })}
        {hasAnyFilter && (
          <button
            type="button"
            className={bStyle.filterChipReset}
            onClick={onClear}
          >
            초기화
          </button>
        )}
      </div>
    </CollapsibleFilterBar>
  );
};

export default DocsListFilterBar;
