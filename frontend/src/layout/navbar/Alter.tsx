import { useId, useSyncExternalStore } from "react";
import { useAuth } from "contexts/authContext";
import { useAlter } from "contexts/alterContext";
import AlterPanel from "./AlterPanel";
import style from "./Alter.module.scss";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(REDUCED_MOTION_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

/** AI를 상징하는 스파클(별) 아이콘 — 작업 중일 때 별이 순차적으로 커지며 회전 */
const AlterIcon = ({
  size = 20,
  working = false,
}: {
  size?: number;
  working?: boolean;
}) => {
  const rawId = useId();
  const gradId = `alter-star-${rawId.replace(/:/g, "")}`;
  const reduceMotion = usePrefersReducedMotion();

  return (
    <svg
      className={`${style.iconStarSvg} ${working ? style.iconStarWorking : ""}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <defs>
        {/* userSpaceOnUse + 넓은 범위로 기존 background-position 시프트와 비슷한 흐름 */}
        <linearGradient
          id={gradId}
          gradientUnits="userSpaceOnUse"
          x1="-6"
          y1="4"
          x2="30"
          y2="20"
        >
          {!reduceMotion && (
            <>
              <animate
                attributeName="x1"
                values="-6;18;-6"
                dur="3.6s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              />
              <animate
                attributeName="y1"
                values="4;10;4"
                dur="3.6s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              />
              <animate
                attributeName="x2"
                values="30;54;30"
                dur="3.6s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              />
              <animate
                attributeName="y2"
                values="20;14;20"
                dur="3.6s"
                repeatCount="indefinite"
                calcMode="spline"
                keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
              />
            </>
          )}
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="25%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#2dd4bf" />
          <stop offset="75%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#c4b5fd" />
        </linearGradient>
      </defs>
      {/* 큰 별 → 작은 위 → 작은 아래 */}
      <path
        className={style.starPart}
        style={{ ["--i" as string]: 0 }}
        fill={`url(#${gradId})`}
        d="M11.5 9.5 9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5z"
      />
      <path
        className={style.starPart}
        style={{ ["--i" as string]: 1 }}
        fill={`url(#${gradId})`}
        d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9z"
      />
      <path
        className={style.starPart}
        style={{ ["--i" as string]: 2 }}
        fill={`url(#${gradId})`}
        d="M19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"
      />
    </svg>
  );
};

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
        <AlterIcon size={20} working={isWorking} />
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
