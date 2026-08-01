import { useEffect, useRef } from "react";
import { useAuth } from "contexts/authContext";
import { useAlter } from "contexts/alterContext";
import AlterPanel from "./AlterPanel";
import style from "./Alter.module.scss";

/** AI를 상징하는 움직이는 그라데이션 스파클(별) 아이콘 */
const AlterIcon = ({ size = 20 }: { size?: number }) => (
  <span
    className={style.iconStar}
    style={{ width: size, height: size }}
    aria-hidden
  />
);

const Alter = () => {
  const { currentSchool, currentSeason, currentRegistration } = useAuth();
  const { isOpen, isExpanded, toggle, close } = useAlter();
  const rootRef = useRef<HTMLDivElement>(null);

  const aiEnabled =
    currentSchool?.aiEnabled !== false &&
    currentSchool?.academyFeatures?.aiEnabled !== false &&
    !!currentSeason?.aiSettings?.enabled &&
    (currentRegistration?.role === "teacher"
      ? !!currentSeason?.aiSettings?.permission?.teacher
      : !!currentSeason?.aiSettings?.permission?.student);

  useEffect(() => {
    if (!isOpen || isExpanded) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isOpen, isExpanded, close]);

  if (!aiEnabled) return null;

  return (
    <>
      {isOpen && isExpanded && (
        <div
          className={style.backdrop}
          onClick={close}
          aria-hidden
        />
      )}
      <div className={style.alterRoot} ref={rootRef}>
        <div
          className={style.iconBtn}
          onClick={toggle}
          title="Alter"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle();
            }
          }}
        >
          <AlterIcon size={20} />
        </div>
        {isOpen && <AlterPanel onClose={close} />}
      </div>
    </>
  );
};

export default Alter;
