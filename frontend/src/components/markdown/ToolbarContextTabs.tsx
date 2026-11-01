import style from "./markdown.module.scss";
import type { EditorContext, ToolbarTab } from "./toolbarTab";

type Props = {
  context: EditorContext;
  tab: ToolbarTab;
  onChange: (tab: ToolbarTab) => void;
};

const ToolbarContextTabs = ({ context, tab, onChange }: Props) => {
  const showTable = context !== "image";

  return (
    <div className={style.toolTabs} role="tablist" aria-label="편집 도구">
      <button
        type="button"
        role="tab"
        aria-selected={tab === "format"}
        className={tab === "format" ? style.active : ""}
        onClick={() => onChange("format")}
      >
        서식
      </button>
      {showTable && (
        <button
          type="button"
          role="tab"
          aria-selected={tab === "table"}
          className={tab === "table" ? style.active : ""}
          onClick={() => onChange("table")}
        >
          표
        </button>
      )}
      {context === "image" && (
        <button
          type="button"
          role="tab"
          aria-selected={tab === "image"}
          className={tab === "image" ? style.active : ""}
          onClick={() => onChange("image")}
        >
          이미지
        </button>
      )}
    </div>
  );
};

export default ToolbarContextTabs;
