/**
 * Alter 작성 도우미 — 가는 3색 그라데이션 원형 + 중앙 별
 */
import { useId } from "react";
import style from "./AlterAIIcon.module.scss";

type Props = {
  size?: number;
  className?: string;
};

const AlterAIIcon = ({ size = 20, className }: Props) => {
  const uid = useId().replace(/:/g, "");
  const gA = `alterAiGradA-${uid}`;
  const gB = `alterAiGradB-${uid}`;
  const gC = `alterAiGradC-${uid}`;
  const gStar = `alterAiGradStar-${uid}`;

  return (
    <svg
      className={`${style.root}${className ? ` ${className}` : ""}`}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ minWidth: size, minHeight: size }}
    >
      <defs>
        <linearGradient id={gA} x1="4" y1="4" x2="20" y2="20">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <linearGradient id={gB} x1="20" y1="4" x2="4" y2="20">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
        <linearGradient id={gC} x1="4" y1="20" x2="20" y2="4">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <linearGradient id={gStar} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8">
            <animate
              attributeName="stop-color"
              values="#38bdf8;#818cf8;#8b5cf6;#d946ef;#f472b6;#38bdf8"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="#8b5cf6">
            <animate
              attributeName="stop-color"
              values="#8b5cf6;#d946ef;#f472b6;#38bdf8;#818cf8;#8b5cf6"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#f472b6">
            <animate
              attributeName="stop-color"
              values="#f472b6;#38bdf8;#818cf8;#8b5cf6;#d946ef;#f472b6"
              dur="4s"
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>
      </defs>

      <g className={style.ringA}>
        <circle
          cx="12"
          cy="12"
          r="8.2"
          fill="none"
          stroke={`url(#${gA})`}
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeDasharray="22 29.5"
        />
      </g>
      <g className={style.ringB}>
        <circle
          cx="12"
          cy="12"
          r="8.2"
          fill="none"
          stroke={`url(#${gB})`}
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeDasharray="22 29.5"
        />
      </g>
      <g className={style.ringC}>
        <circle
          cx="12"
          cy="12"
          r="8.2"
          fill="none"
          stroke={`url(#${gC})`}
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeDasharray="22 29.5"
        />
      </g>

      {/* 4각 스파클 별 (AI 생성·마법 느낌) */}
      <path
        className={style.star}
        fill={`url(#${gStar})`}
        d="M12 7.2l1.15 2.95 2.95 1.15-2.95 1.15L12 16.8l-1.15-2.95L7.9 12.7l2.95-1.15L12 7.2z"
      />
    </svg>
  );
};

export default AlterAIIcon;
