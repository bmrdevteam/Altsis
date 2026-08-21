import { useAppNavigate } from "hooks/useAppNavigate";
import {
  normalizeClientGuideLinks,
  type TAlterGuideLink,
} from "./normalizeGuideLinks";
import style from "../Alter.module.scss";

type Props = {
  links?: TAlterGuideLink[] | null;
};

const GuideLinkChips = ({ links }: Props) => {
  const navigate = useAppNavigate();
  const items = normalizeClientGuideLinks(links);
  if (items.length === 0) return null;

  return (
    <div className={style.guideLinkRow} role="group" aria-label="바로가기">
      {items.map((link) => (
        <button
          key={`${link.kind}:${link.path}`}
          type="button"
          className={`${style.guideLinkChip} ${
            link.kind === "guide" ? style.guideLinkChipGuide : ""
          }`}
          onClick={() => navigate(link.path)}
        >
          {link.title}
        </button>
      ))}
    </div>
  );
};

export default GuideLinkChips;
