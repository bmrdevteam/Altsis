import { useEffect, useState } from "react";
import style from "./dashboard.module.scss";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Svg from "assets/svg/Svg";
import {
  TDashboard,
  TDashboardDelta,
  TDashboardPeriod,
  TDashboardScope,
  TSeasonStat,
  TTrafficStat,
  TStorageStat,
  TAIUsage,
  TDashboardDeltas,
} from "types/dashboard";
import {
  formatAlt,
  formatBytes,
  formatDate,
  formatDeltaPercent,
  formatNumber,
  getDeltaTone,
  responseTimeStatus,
  tokensToAlts,
} from "./dashboardFormat";

type Props = {
  schoolId: string;
};

const PERIODS: { value: TDashboardPeriod; label: string }[] = [
  { value: 7, label: "7일" },
  { value: 14, label: "14일" },
  { value: 30, label: "30일" },
];

const SCOPES: { value: TDashboardScope; label: string }[] = [
  { value: "school", label: "이 학교" },
  { value: "academy", label: "아카데미" },
];

const emptyDeltas = (): TDashboardDeltas => ({
  summary: {
    totalStudents: { absolute: null, percent: null },
    totalTeachers: { absolute: null, percent: null },
    totalCourses: { absolute: null, percent: null },
    totalEnrollments: { absolute: null, percent: null },
  },
  traffic: {
    requests: { absolute: null, percent: null },
    avgResponseTime: { absolute: null, percent: null },
    dataOut: { absolute: null, percent: null },
    uniqueUsers: { absolute: null, percent: null },
  },
  ai: {
    requests: { absolute: null, percent: null },
    totalTokens: { absolute: null, percent: null },
  },
});

const Dashboard = ({ schoolId }: Props) => {
  const { SchoolAPI } = useAPIv2();
  const [dashboard, setDashboard] = useState<TDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<TDashboardPeriod>(7);
  const [scope, setScope] = useState<TDashboardScope>("school");

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    SchoolAPI.RSchoolDashboard({
      params: { _id: schoolId },
      query: { period, scope },
    })
      .then(({ dashboard: data }) => {
        if (cancelled) return;
        setDashboard({
          ...data,
          deltas: data.deltas ?? emptyDeltas(),
          meta: data.meta ?? {
            period,
            scope,
            academyOnlyMetrics: ["traffic", "storage", "ai"],
            comparedTo: null,
            trafficComparedTo: "previousPeriod",
          },
        });
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        ALERT_ERROR(err);
        setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId, period, scope]);

  return (
    <div className={style.dashboardContainer}>
      <div className={style.toolbar} role="toolbar" aria-label="대시보드 필터">
        <div className={style.filterGroup}>
          <span className={style.filterLabel}>기간</span>
          <div className={style.segmented} role="group" aria-label="기간 선택">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`${style.segmentBtn} ${
                  period === p.value ? style.segmentBtnActive : ""
                }`}
                aria-pressed={period === p.value}
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className={style.filterGroup}>
          <span className={style.filterLabel}>범위</span>
          <div className={style.segmented} role="group" aria-label="집계 범위">
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={`${style.segmentBtn} ${
                  scope === s.value ? style.segmentBtnActive : ""
                }`}
                aria-pressed={scope === s.value}
                onClick={() => setScope(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && <DashboardSkeleton />}

      {!isLoading && !dashboard && (
        <div className={style.emptyMessage}>데이터를 불러올 수 없습니다.</div>
      )}

      {!isLoading && dashboard && (
        <>
          <SummaryCards
            summary={dashboard.summary}
            deltas={dashboard.deltas.summary}
            comparedTo={dashboard.meta.comparedTo}
            scope={dashboard.meta.scope}
          />

          <div className={style.mainGrid}>
            <TrafficSection
              stats={dashboard.trafficStats}
              deltas={dashboard.deltas.traffic}
              period={dashboard.meta.period}
            />
            {dashboard.storageStats.length > 0 ? (
              <StorageSection stats={dashboard.storageStats} />
            ) : (
              <section className={style.section} aria-label="S3 저장 용량">
                <h3 className={style.sectionTitle}>
                  S3 저장 용량
                  <span className={style.sectionSubLabel}>아카데미 전체</span>
                </h3>
                <p className={style.emptyInline}>저장 데이터가 없습니다.</p>
              </section>
            )}
          </div>

          <AIUsageSection
            aiUsage={dashboard.aiUsage}
            deltas={dashboard.deltas.ai}
            period={dashboard.meta.period}
          />

          {dashboard.seasonStats.length > 0 && (
            <section className={style.section}>
              <h3 className={style.sectionTitle}>학기별 현황</h3>
              <SeasonChart seasonStats={dashboard.seasonStats} />
            </section>
          )}
        </>
      )}
    </div>
  );
};

/* ─── Skeleton ─── */

const DashboardSkeleton = () => (
  <div className={style.skeletonRoot} aria-busy="true" aria-label="로딩 중">
    <div className={style.summaryGrid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={`${style.summaryCard} ${style.skeletonCard}`}>
          <div className={style.skeletonLine} style={{ width: "40%" }} />
          <div className={style.skeletonLine} style={{ width: "70%", height: 28 }} />
        </div>
      ))}
    </div>
    <div className={style.mainGrid}>
      <div className={`${style.section} ${style.skeletonCard}`}>
        <div className={style.skeletonLine} style={{ width: "35%", marginBottom: 16 }} />
        <div className={style.skeletonChart} />
      </div>
      <div className={`${style.section} ${style.skeletonCard}`}>
        <div className={style.skeletonLine} style={{ width: "40%", marginBottom: 16 }} />
        <div className={style.skeletonChart} style={{ height: 120 }} />
      </div>
    </div>
  </div>
);

/* ─── Delta badge ─── */

const DeltaBadge = ({
  delta,
  invert = false,
  hint,
}: {
  delta?: TDashboardDelta;
  invert?: boolean;
  hint?: string;
}) => {
  const label = formatDeltaPercent(delta);
  if (!label) return null;
  const tone = getDeltaTone(delta, invert);
  return (
    <span
      className={`${style.deltaBadge} ${style[`delta_${tone}`]}`}
      title={hint}
    >
      {label}
    </span>
  );
};

/* ─── Summary Cards ─── */

const SummaryCards = ({
  summary,
  deltas,
  comparedTo,
  scope,
}: {
  summary: TDashboard["summary"];
  deltas: TDashboardDeltas["summary"];
  comparedTo: TDashboard["meta"]["comparedTo"];
  scope: TDashboardScope;
}) => {
  const cards: {
    label: string;
    value: number;
    unit: string;
    icon: string;
    tone: string;
    deltaKey: keyof TDashboardDeltas["summary"];
  }[] = [
    {
      label: "학생",
      value: summary.totalStudents,
      unit: "명",
      icon: "users",
      tone: "toneStudents",
      deltaKey: "totalStudents",
    },
    {
      label: "교사",
      value: summary.totalTeachers,
      unit: "명",
      icon: "user",
      tone: "toneTeachers",
      deltaKey: "totalTeachers",
    },
    {
      label: "수업",
      value: summary.totalCourses,
      unit: "개",
      icon: "bookOpen",
      tone: "toneCourses",
      deltaKey: "totalCourses",
    },
    {
      label: "수강",
      value: summary.totalEnrollments,
      unit: "건",
      icon: "list_check",
      tone: "toneEnrollments",
      deltaKey: "totalEnrollments",
    },
  ];

  const compareHint =
    comparedTo === "previousSeason" ? "직전 학기 대비" : undefined;

  return (
    <div
      className={style.summaryGrid}
      role="group"
      aria-label={
        scope === "academy" ? "아카데미 요약 지표" : "학교 요약 지표"
      }
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${style.summaryCard} ${style[card.tone]}`}
        >
          <div className={style.summaryHeader}>
            <span className={style.summaryIcon} aria-hidden>
              <Svg type={card.icon} width="16px" height="16px" />
            </span>
            <span className={style.summaryLabel}>{card.label}</span>
            <DeltaBadge delta={deltas[card.deltaKey]} hint={compareHint} />
          </div>
          <div className={style.summaryValueRow}>
            <span className={style.summaryValue}>
              {formatNumber(card.value)}
            </span>
            <span className={style.summaryUnit}>{card.unit}</span>
          </div>
          {compareHint && deltas[card.deltaKey]?.percent !== null && (
            <span className={style.summaryHint}>{compareHint}</span>
          )}
        </div>
      ))}
    </div>
  );
};

/* ─── Traffic Section ─── */

const TrafficSection = ({
  stats,
  deltas,
  period,
}: {
  stats: TTrafficStat[];
  deltas: TDashboardDeltas["traffic"];
  period: TDashboardPeriod;
}) => {
  const totalRequests = stats.reduce((s, d) => s + d.requests, 0);
  const totalDataOut = stats.reduce((s, d) => s + d.dataOut, 0);
  const avgResponseTime =
    totalRequests > 0
      ? Math.round(
          stats.reduce((s, d) => s + d.avgResponseTime * d.requests, 0) /
            totalRequests
        )
      : 0;
  const maxRequests = Math.max(...stats.map((d) => d.requests), 1);
  const rtStatus = responseTimeStatus(avgResponseTime);

  return (
    <section className={style.section} aria-label="API 트래픽">
      <h3 className={style.sectionTitle}>
        API 트래픽
        <span className={style.sectionSubLabel}>
          아카데미 전체 · 최근 {period}일
        </span>
      </h3>
      <div className={style.trafficSummary}>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>총 요청</span>
          <span className={style.trafficCardValueRow}>
            <span className={style.trafficCardValue}>
              {formatNumber(totalRequests)}
            </span>
            <DeltaBadge
              delta={deltas.requests}
              hint="직전 동일 기간 대비"
            />
          </span>
        </div>
        <div className={`${style.trafficCard} ${style[`status_${rtStatus}`]}`}>
          <span className={style.trafficCardLabel}>평균 응답시간</span>
          <span className={style.trafficCardValueRow}>
            <span className={style.trafficCardValue}>{avgResponseTime}ms</span>
            <DeltaBadge
              delta={deltas.avgResponseTime}
              invert
              hint="직전 동일 기간 대비 (낮을수록 좋음)"
            />
          </span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>데이터 전송량</span>
          <span className={style.trafficCardValueRow}>
            <span className={style.trafficCardValue}>
              {formatBytes(totalDataOut)}
            </span>
            <DeltaBadge delta={deltas.dataOut} hint="직전 동일 기간 대비" />
          </span>
        </div>
      </div>

      {stats.length > 0 ? (
        <div
          className={style.columnChart}
          role="img"
          aria-label={`최근 ${period}일 일별 API 요청 수`}
        >
          {stats.map((stat) => {
            const heightPct = Math.max(
              (stat.requests / maxRequests) * 100,
              stat.requests > 0 ? 4 : 0
            );
            return (
              <div key={stat.date} className={style.columnItem}>
                <div className={style.columnValue}>
                  {stat.requests > 0 ? formatNumber(stat.requests) : ""}
                </div>
                <div className={style.columnTrack}>
                  <div
                    className={style.columnFill}
                    style={{ height: `${heightPct}%` }}
                    title={`${formatDate(stat.date)}: ${formatNumber(
                      stat.requests
                    )}건 · ${stat.uniqueUsers}명`}
                  />
                </div>
                <span className={style.columnLabel}>
                  {formatDate(stat.date)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={style.emptyInline}>트래픽 데이터가 없습니다.</p>
      )}
    </section>
  );
};

/* ─── Storage Section ─── */

const STORAGE_TONES = [
  "storageTone0",
  "storageTone1",
  "storageTone2",
  "storageTone3",
  "storageTone4",
  "storageTone5",
];

const StorageSection = ({ stats }: { stats: TStorageStat[] }) => {
  const totalCount = stats.reduce((s, d) => s + d.count, 0);
  const totalSize = stats.reduce((s, d) => s + d.totalSize, 0);
  const maxSize = Math.max(...stats.map((d) => d.totalSize), 1);

  return (
    <section className={style.section} aria-label="S3 저장 용량">
      <h3 className={style.sectionTitle}>
        S3 저장 용량
        <span className={style.sectionSubLabel}>아카데미 전체</span>
      </h3>

      <div className={style.storageHero}>
        <span className={style.storageHeroValue}>{formatBytes(totalSize)}</span>
        <span className={style.storageHeroMeta}>
          {formatNumber(totalCount)}개 객체
        </span>
      </div>

      {totalSize > 0 && (
        <div
          className={style.storageStack}
          role="img"
          aria-label="카테고리별 저장 용량 비율"
        >
          {stats
            .filter((s) => s.totalSize > 0)
            .map((stat, idx) => (
              <div
                key={stat.name}
                className={`${style.storageStackSegment} ${
                  style[STORAGE_TONES[idx % STORAGE_TONES.length]]
                }`}
                style={{
                  width: `${(stat.totalSize / totalSize) * 100}%`,
                }}
                title={`${stat.name}: ${formatBytes(stat.totalSize)}`}
              />
            ))}
        </div>
      )}

      <div className={style.storageList}>
        {stats.map((stat, idx) => (
          <div key={stat.name} className={style.storageRow}>
            <div className={style.storageNameRow}>
              <span
                className={`${style.storageDot} ${
                  style[STORAGE_TONES[idx % STORAGE_TONES.length]]
                }`}
                aria-hidden
              />
              <span className={style.storageName}>{stat.name}</span>
            </div>
            <div className={style.storageBarWrap}>
              <div className={style.barTrack}>
                <div
                  className={`${style.barFill} ${
                    style[STORAGE_TONES[idx % STORAGE_TONES.length]]
                  }`}
                  style={{
                    width: `${(stat.totalSize / maxSize) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className={style.storageInfo}>
              <span className={style.storageCount}>
                {formatNumber(stat.count)}개
              </span>
              <span className={style.storageSize}>
                {formatBytes(stat.totalSize)}
              </span>
              <span className={style.storagePct}>
                {totalSize > 0
                  ? `${Math.round((stat.totalSize / totalSize) * 100)}%`
                  : "0%"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ─── AI Usage Section ─── */

const AIUsageSection = ({
  aiUsage,
  deltas,
  period,
}: {
  aiUsage: TAIUsage;
  deltas: TDashboardDeltas["ai"];
  period: TDashboardPeriod;
}) => {
  const tokensPerAlt = aiUsage.tokensPerAlt || 10000;
  const periodTokens = aiUsage.daily.reduce((s, d) => s + d.totalTokens, 0);
  const periodAlts = aiUsage.totalAlts ?? tokensToAlts(periodTokens, tokensPerAlt);
  const periodRequests = aiUsage.daily.reduce((s, d) => s + d.requests, 0);
  const dailyAlts = aiUsage.daily.map((d) =>
    tokensToAlts(d.totalTokens, tokensPerAlt)
  );
  const maxAlts = Math.max(...dailyAlts, 1);
  const totalAlts = tokensToAlts(aiUsage.total.totalTokens, tokensPerAlt);
  const topUsers = aiUsage.topUsers || [];

  return (
    <section className={style.section} aria-label="AI Alt 사용량">
      <h3 className={style.sectionTitle}>
        AI Alt 사용량
        <span className={style.sectionSubLabel}>
          아카데미 전체 · 최근 {period}일
        </span>
      </h3>
      <div className={style.aiSummary}>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>기간 요청</span>
          <span className={style.trafficCardValueRow}>
            <span className={style.trafficCardValue}>
              {formatNumber(periodRequests)}회
            </span>
            <DeltaBadge delta={deltas.requests} hint="직전 동일 기간 대비" />
          </span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>기간 Alt</span>
          <span className={style.trafficCardValueRow}>
            <span className={style.trafficCardValue}>
              {formatAlt(periodAlts)}
            </span>
            <DeltaBadge delta={deltas.totalTokens} hint="직전 동일 기간 대비" />
          </span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>누적 요청</span>
          <span className={style.trafficCardValue}>
            {formatNumber(aiUsage.total.requests)}회
          </span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>누적 Alt</span>
          <span className={style.trafficCardValue}>{formatAlt(totalAlts)}</span>
        </div>
      </div>
      <p className={style.aiCostNote}>
        1 Alt = {formatNumber(tokensPerAlt)} 토큰 · 한도·사용량과 동일한 단위입니다.
      </p>
      {aiUsage.daily.some((d) => d.totalTokens > 0) ? (
        <div
          className={style.columnChart}
          role="img"
          aria-label={`최근 ${period}일 일별 AI Alt 사용량`}
        >
          {aiUsage.daily.map((day, i) => {
            const alts = dailyAlts[i];
            const heightPct = Math.max(
              (alts / maxAlts) * 100,
              alts > 0 ? 4 : 0
            );
            return (
              <div key={day.date} className={style.columnItem}>
                <div className={style.columnValue}>
                  {alts > 0 ? formatAlt(alts) : ""}
                </div>
                <div className={style.columnTrack}>
                  <div
                    className={`${style.columnFill} ${style.columnFillAi}`}
                    style={{ height: `${heightPct}%` }}
                    title={`${formatDate(day.date)}: ${formatAlt(alts)} Alt · ${
                      day.requests
                    }회`}
                  />
                </div>
                <span className={style.columnLabel}>
                  {formatDate(day.date)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className={style.emptyInline}>기간 내 AI 사용 기록이 없습니다.</p>
      )}
      {topUsers.length > 0 && (
        <div className={style.aiTopUsers}>
          <h4 className={style.aiTopUsersTitle}>사용자 Top (기간)</h4>
          <table className={style.aiTopTable}>
            <thead>
              <tr>
                <th scope="col">사용자</th>
                <th scope="col">요청</th>
                <th scope="col">Alt</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u) => (
                <tr key={u.userId}>
                  <td>
                    <span className={style.aiTopName}>{u.userName}</span>
                    <span className={style.aiTopId}>{u.userId}</span>
                  </td>
                  <td>{formatNumber(u.requests)}</td>
                  <td>
                    {formatAlt(
                      u.totalAlts ?? tokensToAlts(u.totalTokens, tokensPerAlt)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

/* ─── Season Comparison Chart ─── */

const SeasonChart = ({ seasonStats }: { seasonStats: TSeasonStat[] }) => {
  const recent = seasonStats.slice(0, 6).reverse();
  const maxCount = Math.max(
    ...recent.map((s) => Math.max(s.studentCount, s.teacherCount)),
    1
  );

  return (
    <div className={style.barChartContainer}>
      {recent.map((season) => (
        <div key={season._id} className={style.seasonRow}>
          <div className={style.barRowTop}>
            <span className={style.barLabel}>
              {season.year} {season.term}
              {season.isActivated && (
                <span className={style.activeBadge}>활성</span>
              )}
            </span>
          </div>
          <div className={style.dualBarGroup}>
            <div className={style.dualBarRow}>
              <span className={style.dualBarLabel}>학생</span>
              <div className={style.barTrack}>
                <div
                  className={style.barFill}
                  style={{
                    width: `${(season.studentCount / maxCount) * 100}%`,
                  }}
                />
              </div>
              <span className={style.barValue}>{season.studentCount}명</span>
            </div>
            <div className={style.dualBarRow}>
              <span className={style.dualBarLabel}>교사</span>
              <div className={style.barTrack}>
                <div
                  className={`${style.barFill} ${style.barFillSecondary}`}
                  style={{
                    width: `${(season.teacherCount / maxCount) * 100}%`,
                  }}
                />
              </div>
              <span className={style.barValue}>{season.teacherCount}명</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
