import { ReactNode } from "react";
import { DraftMetaVariant } from "./draftUi";
import style from "../Alter.module.scss";

export const draftMetaVariantClass = (variant: DraftMetaVariant) => {
  if (variant === "good") return style.levelGood;
  if (variant === "fair") return style.levelFair;
  if (variant === "empty") return style.levelEmpty;
  if (variant === "needs") return style.levelNeeds;
  return style.levelNeutral;
};

type Props = {
  title: string;
  meta?: { label: string; variant?: DraftMetaVariant };
  summary?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  /** wrap in reviewList outer container (default true for single card) */
  wrapList?: boolean;
};

const DraftResultCard = ({
  title,
  meta,
  summary,
  children,
  actions,
  wrapList = true,
}: Props) => {
  const card = (
    <div className={style.reviewItem}>
      <div className={style.reviewHeader}>
        <span>{title}</span>
        {meta ? (
          <span
            className={`${style.levelChip} ${draftMetaVariantClass(
              meta.variant || "neutral"
            )}`}
          >
            {meta.label}
          </span>
        ) : null}
      </div>
      {summary ? <div className={style.reviewComment}>{summary}</div> : null}
      {children}
      {actions ? <div className={style.draftActions}>{actions}</div> : null}
    </div>
  );
  if (!wrapList) return card;
  return <div className={style.reviewList}>{card}</div>;
};

export default DraftResultCard;
