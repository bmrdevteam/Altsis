import { useEffect, useRef } from "react";
import style from "./markdown.module.scss";

type Props = {
  onClose: () => void;
};

const ROWS: Array<{ keys: string; desc: string }> = [
  { keys: "# ~ ######", desc: "제목 1~6" },
  { keys: "**텍스트**", desc: "굵게" },
  { keys: "*텍스트*", desc: "기울임" },
  { keys: "~~텍스트~~", desc: "취소선" },
  { keys: "- 항목", desc: "목록" },
  { keys: "1. 항목", desc: "번호 목록" },
  { keys: "- [ ]", desc: "체크리스트" },
  { keys: "> 인용", desc: "인용문" },
  { keys: "> [!NOTE]", desc: "콜아웃" },
  { keys: "---", desc: "구분선" },
  { keys: "`코드`", desc: "인라인 코드" },
  { keys: "```", desc: "코드 블록" },
  { keys: "/", desc: "슬래시 명령" },
];

const MarkdownShortcutsHelp = ({ onClose }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      className={style.shortcutsHelp}
      ref={ref}
      data-editor-popup
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className={style.shortcutsHelpTitle}>타이핑 단축 문법</div>
      <ul className={style.shortcutsHelpList}>
        {ROWS.map((row) => (
          <li key={row.keys} className={style.shortcutsHelpRow}>
            <code className={style.shortcutsHelpKeys}>{row.keys}</code>
            <span className={style.shortcutsHelpDesc}>{row.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MarkdownShortcutsHelp;
