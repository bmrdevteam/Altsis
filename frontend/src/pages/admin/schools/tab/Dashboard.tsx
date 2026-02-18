import { useEffect, useState } from "react";
import style from "./dashboard.module.scss";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import Loading from "components/loading/Loading";
import {
  TDashboard,
  TSeasonStat,
  TCourseFillRate,
  TBoardActivity,
  TTrafficStat,
  TStorageStat,
  TAIUsage,
} from "types/dashboard";

type Props = {
  schoolId: string;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatNumber = (n: number): string => {
  return n.toLocaleString();
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const Dashboard = ({ schoolId }: Props) => {
  const { SchoolAPI } = useAPIv2();
  const [dashboard, setDashboard] = useState<TDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    SchoolAPI.RSchoolDashboard({ params: { _id: schoolId } })
      .then(({ dashboard }) => {
        setDashboard(dashboard);
        setIsLoading(false);
      })
      .catch((err) => {
        ALERT_ERROR(err);
        setIsLoading(false);
      });
  }, [schoolId]);

  if (isLoading) return <Loading height="400px" />;
  if (!dashboard)
    return (
      <div className={style.emptyMessage}>데이터를 불러올 수 없습니다.</div>
    );

  return (
    <div className={style.dashboardContainer}>
      <SummaryCards summary={dashboard.summary} />

      {dashboard.trafficStats.length > 0 && (
        <TrafficSection stats={dashboard.trafficStats} />
      )}

      {dashboard.storageStats.length > 0 && (
        <StorageSection stats={dashboard.storageStats} />
      )}

      <AIUsageSection aiUsage={dashboard.aiUsage} />

      {dashboard.seasonStats.length > 0 && (
        <section className={style.section}>
          <h3 className={style.sectionTitle}>학기별 현황</h3>
          <SeasonChart seasonStats={dashboard.seasonStats} />
        </section>
      )}

      {dashboard.courseFillRates.length > 0 && (
        <section className={style.section}>
          <h3 className={style.sectionTitle}>수업 수강 현황</h3>
          <CourseFillRates courses={dashboard.courseFillRates} />
        </section>
      )}

      {dashboard.boardActivity.length > 0 && (
        <section className={style.section}>
          <h3 className={style.sectionTitle}>보드 활동</h3>
          <BoardActivityChart boards={dashboard.boardActivity} />
        </section>
      )}
    </div>
  );
};

/* ─── Summary Cards ─── */

const SummaryCards = ({ summary }: { summary: TDashboard["summary"] }) => {
  const cards = [
    { label: "학생", value: summary.totalStudents, unit: "명" },
    { label: "교사", value: summary.totalTeachers, unit: "명" },
    { label: "수업", value: summary.totalCourses, unit: "개" },
    { label: "수강", value: summary.totalEnrollments, unit: "건" },
  ];

  return (
    <div className={style.summaryGrid}>
      {cards.map((card) => (
        <div key={card.label} className={style.summaryCard}>
          <span className={style.summaryLabel}>{card.label}</span>
          <div className={style.summaryValueRow}>
            <span className={style.summaryValue}>
              {formatNumber(card.value)}
            </span>
            <span className={style.summaryUnit}>{card.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Traffic Section ─── */

const TrafficSection = ({ stats }: { stats: TTrafficStat[] }) => {
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

  return (
    <section className={style.section}>
      <h3 className={style.sectionTitle}>
        API 트래픽
        <span className={style.sectionSubLabel}>아카데미 전체 · 최근 7일</span>
      </h3>
      <div className={style.trafficSummary}>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>총 요청</span>
          <span className={style.trafficCardValue}>
            {formatNumber(totalRequests)}
          </span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>평균 응답시간</span>
          <span className={style.trafficCardValue}>{avgResponseTime}ms</span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>데이터 전송량</span>
          <span className={style.trafficCardValue}>
            {formatBytes(totalDataOut)}
          </span>
        </div>
      </div>
      <div className={style.barChartContainer}>
        {stats.map((stat) => (
          <div key={stat.date} className={style.barRow}>
            <div className={style.barRowTop}>
              <span className={style.barLabel}>{formatDate(stat.date)}</span>
              <span className={style.barValue}>
                {formatNumber(stat.requests)}건 · {stat.uniqueUsers}명
              </span>
            </div>
            <div className={style.barTrack}>
              <div
                className={style.barFill}
                style={{
                  width: `${(stat.requests / maxRequests) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ─── Storage Section ─── */

const StorageSection = ({ stats }: { stats: TStorageStat[] }) => {
  const totalCount = stats.reduce((s, d) => s + d.count, 0);
  const totalSize = stats.reduce((s, d) => s + d.totalSize, 0);

  return (
    <section className={style.section}>
      <h3 className={style.sectionTitle}>
        S3 저장 용량
        <span className={style.sectionSubLabel}>아카데미 전체</span>
      </h3>
      <div className={style.storageList}>
        {stats.map((stat) => (
          <div key={stat.name} className={style.storageRow}>
            <span className={style.storageName}>{stat.name}</span>
            <div className={style.storageInfo}>
              <span className={style.storageCount}>
                {formatNumber(stat.count)}개
              </span>
              <span className={style.storageSize}>
                {formatBytes(stat.totalSize)}
              </span>
            </div>
          </div>
        ))}
        <div className={style.storageTotalRow}>
          <span className={style.storageTotalLabel}>
            합계 ({formatNumber(totalCount)}개)
          </span>
          <span className={style.storageTotalSize}>
            {formatBytes(totalSize)}
          </span>
        </div>
      </div>
    </section>
  );
};

/* ─── AI Usage Section ─── */

const AIUsageSection = ({ aiUsage }: { aiUsage: TAIUsage }) => {
  const maxTokens = Math.max(...aiUsage.daily.map((d) => d.totalTokens), 1);

  return (
    <section className={style.section}>
      <h3 className={style.sectionTitle}>
        AI 토큰 사용량
        <span className={style.sectionSubLabel}>아카데미 전체</span>
      </h3>
      <div className={style.aiSummary}>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>총 요청</span>
          <span className={style.trafficCardValue}>
            {formatNumber(aiUsage.total.requests)}회
          </span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>총 토큰</span>
          <span className={style.trafficCardValue}>
            {formatNumber(aiUsage.total.totalTokens)}
          </span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>입력</span>
          <span className={style.trafficCardValue}>
            {formatNumber(aiUsage.total.promptTokens)}
          </span>
        </div>
        <div className={style.trafficCard}>
          <span className={style.trafficCardLabel}>출력</span>
          <span className={style.trafficCardValue}>
            {formatNumber(aiUsage.total.candidatesTokens)}
          </span>
        </div>
        {aiUsage.total.thoughtsTokens > 0 && (
          <div className={style.trafficCard}>
            <span className={style.trafficCardLabel}>사고</span>
            <span className={style.trafficCardValue}>
              {formatNumber(aiUsage.total.thoughtsTokens)}
            </span>
          </div>
        )}
      </div>
      {aiUsage.daily.some((d) => d.totalTokens > 0) && (
        <div className={style.barChartContainer}>
          {aiUsage.daily.map((day) => (
            <div key={day.date} className={style.barRow}>
              <div className={style.barRowTop}>
                <span className={style.barLabel}>{formatDate(day.date)}</span>
                <span className={style.barValue}>
                  {formatNumber(day.totalTokens)} 토큰 · {day.requests}회
                </span>
              </div>
              <div className={style.barTrack}>
                <div
                  className={style.barFill}
                  style={{
                    width: `${(day.totalTokens / maxTokens) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
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

/* ─── Course Fill Rates ─── */

const CourseFillRates = ({ courses }: { courses: TCourseFillRate[] }) => {
  const maxCount = Math.max(...courses.map((c) => c.count), 1);

  return (
    <div className={style.barChartContainer}>
      {courses.map((course, idx) => (
        <div key={idx} className={style.barRow}>
          <div className={style.barRowTop}>
            <span className={style.barLabel} title={course.classTitle}>
              {course.classTitle}
            </span>
            <span className={style.barValue}>
              {course.count}/{course.limit || "∞"}명
              {course.fillRate !== null && ` (${course.fillRate}%)`}
            </span>
          </div>
          <div className={style.barTrack}>
            <div
              className={`${style.barFill} ${
                course.fillRate !== null && course.fillRate >= 90
                  ? style.barFillWarning
                  : ""
              }`}
              style={{ width: `${(course.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ─── Board Activity ─── */

const BoardActivityChart = ({ boards }: { boards: TBoardActivity[] }) => {
  const maxPosts = Math.max(...boards.map((b) => b.postCount), 1);

  return (
    <div className={style.barChartContainer}>
      {boards.map((board, idx) => (
        <div key={idx} className={style.barRow}>
          <div className={style.barRowTop}>
            <span className={style.barLabel}>{board.name}</span>
            <span className={style.barValue}>{board.postCount}개 게시글</span>
          </div>
          <div className={style.barTrack}>
            <div
              className={style.barFill}
              style={{ width: `${(board.postCount / maxPosts) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
