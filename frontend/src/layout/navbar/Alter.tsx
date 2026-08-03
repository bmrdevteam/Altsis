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
  const {
    isOpen,
    isWorking,
    hasBackgroundResult,
    toggle,
    close,
  } = useAlter();

  const aiEnabled =
    currentSchool?.aiEnabled !== false &&
    currentSchool?.academyFeatures?.aiEnabled !== false &&
    !!currentSeason?.aiSettings?.enabled &&
    (currentRegistration?.role === "teacher"
      ? !!currentSeason?.aiSettings?.permission?.teacher
      : !!currentSeason?.aiSettings?.permission?.student);

  if (!aiEnabled) return null;

  return (
    <div className={style.alterRoot}>
      <div
        className={style.iconBtn}
        onClick={toggle}
        title={
          isWorking
            ? "Alter (작업 진행 중)"
            : hasBackgroundResult
              ? "Alter (새 결과)"
              : "Alter"
        }
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
        {(isWorking || hasBackgroundResult) && (
          <span
            className={`${style.iconBadge} ${
              isWorking ? style.iconBadgeWorking : style.iconBadgeDone
            }`}
            aria-hidden
          />
        )}
      </div>
      {/* 닫아도 언마운트하지 않아 진행 중 fetch/SSE가 끊기지 않음 */}
      <div
        className={isOpen ? undefined : style.panelHostHidden}
        aria-hidden={!isOpen}
      >
        <AlterPanel onClose={close} />
      </div>
    </div>
  );
};

export default Alter;
