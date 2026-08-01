/**
 * Alter 점검 결과 뱃지
 */
import style from "./AIGeneratePopup.module.scss";

export const REVIEW_LEVEL_LABEL: Record<string, string> = {
  good: "충분",
  fair: "보통",
  needs_work: "보완",
  empty: "미작성",
};

export type TAlterReviewResult = {
  summary: string;
  overallLevel: string;
  items: Array<{
    field: string;
    level: string;
    comment: string;
    suggestion: string;
  }>;
};

type Props = {
  overallLevel: string;
  onClick?: () => void;
  title?: string;
  size?: "sm" | "md";
};

const levelClass = (level: string) => {
  if (level === "good") return style.levelGood;
  if (level === "fair") return style.levelFair;
  if (level === "empty") return style.levelEmpty;
  return style.levelNeeds;
};

const AlterReviewBadge = ({
  overallLevel,
  onClick,
  title = "점검 결과 보기",
  size = "sm",
}: Props) => {
  const label = REVIEW_LEVEL_LABEL[overallLevel] || overallLevel || "결과";
  const className = `${style.levelChip} ${levelClass(overallLevel)} ${
    style.reviewBadgeBtn
  } ${size === "sm" ? style.reviewBadgeSm : ""}`;

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        title={title}
        aria-label={title}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={className} title={title}>
      {label}
    </span>
  );
};

export default AlterReviewBadge;
