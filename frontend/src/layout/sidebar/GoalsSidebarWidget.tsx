import Svg from "assets/svg/Svg";
import { useAuth } from "contexts/authContext";
import useAPIv2 from "hooks/useAPIv2";
import { useAppNavigate } from "hooks/useAppNavigate";
import _ from "lodash";
import { filterAndApplyTargets } from "pages/goals/goalItemCatalog";
import { goalItemKind, hrefForGoalItem } from "pages/goals/goalHref";
import { sortByItemOrder } from "pages/goals/goalItemOrder";
import {
  getGoalsCached,
  goalsCacheKey,
  subscribeGoalsCacheInvalidation,
} from "pages/goals/goalsCache";
import {
  readSelectedGoalItemIds,
  resolveSelectedIds,
  subscribeGoalSidebarPrefs,
  TGoalSidebarChip,
} from "pages/goals/goalSidebarPrefs";
import { useEffect, useMemo, useState } from "react";
import {
  appendEvaluationSummary,
  computeArchiveSummary,
  computeBoardSummary,
  computeCreatedSummary,
  computeEnrolledSummary,
  computeMentoringBaseSummary,
  aggregateMentoringEvaluationCounts,
  withItemIds,
  TSummaryItem,
} from "utils/computeCourseSummaries";
import style from "./sidebar.module.scss";

type Props = {
  open: boolean;
  onNavigate?: () => void;
};

const COLLAPSE_KEY = "goals.sidebarCollapsed";

const ratioPct = (item: Pick<TSummaryItem, "current" | "total">) => {
  if (item.total == null || item.total <= 0 || item.current == null) return 0;
  return Math.min(100, Math.round((item.current / item.total) * 100));
};

const remainingOf = (item: Pick<TSummaryItem, "current" | "total">) => {
  if (item.total == null || item.total <= 0 || item.current == null) return 0;
  return Math.max(0, item.total - item.current);
};

const readCollapsed = (schoolId: string, userId: string) => {
  try {
    return localStorage.getItem(`${COLLAPSE_KEY}:${schoolId}:${userId}`) === "1";
  } catch {
    return false;
  }
};

const writeCollapsed = (
  schoolId: string,
  userId: string,
  collapsed: boolean
) => {
  try {
    localStorage.setItem(
      `${COLLAPSE_KEY}:${schoolId}:${userId}`,
      collapsed ? "1" : "0"
    );
  } catch {
    /* ignore */
  }
};

const kindClass = (kind: TGoalSidebarChip["kind"]) => {
  switch (kind) {
    case "enrolled":
      return style.goals_kind_enrolled;
    case "created":
      return style.goals_kind_created;
    case "mentoring":
      return style.goals_kind_mentoring;
    case "archive":
      return style.goals_kind_archive;
    case "board":
      return style.goals_kind_board;
    default:
      return style.goals_kind_other;
  }
};

const GoalsSidebarWidget = ({ open, onNavigate }: Props) => {
  const { GoalAPI, SyllabusAPI, EnrollmentAPI } = useAPIv2();
  const {
    currentSchool,
    currentSeason,
    currentRegistration,
    currentUser,
  } = useAuth();
  const navigate = useAppNavigate();
  /** 로드된 전체 후보 (선택·순서 적용 전) */
  const [allItems, setAllItems] = useState<TGoalSidebarChip[]>([]);
  const [itemOrder, setItemOrder] = useState<string[]>([]);
  const [chips, setChips] = useState<TGoalSidebarChip[]>([]);
  const [prefsTick, setPrefsTick] = useState(0);
  const [dataTick, setDataTick] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const seasonId =
    currentRegistration?.season || currentSeason?._id || undefined;
  const isTeacher = currentRegistration?.role === "teacher";

  useEffect(() => {
    if (!currentSchool?._id || !currentUser?._id) return;
    setCollapsed(readCollapsed(currentSchool._id, currentUser._id));
  }, [currentSchool?._id, currentUser?._id]);

  useEffect(() => subscribeGoalSidebarPrefs(() => setPrefsTick((n) => n + 1)), []);
  useEffect(
    () => subscribeGoalsCacheInvalidation(() => setDataTick((n) => n + 1)),
    []
  );

  // 데이터 로드 — 선택(prefs) 변경과는 분리
  useEffect(() => {
    if (
      !currentSchool?._id ||
      currentSchool.goalsEnabled === false ||
      !currentUser?._id ||
      !seasonId
    ) {
      setAllItems([]);
      setItemOrder([]);
      return;
    }

    let cancelled = false;
    const key = goalsCacheKey(
      currentSchool._id,
      seasonId,
      currentUser._id
    );

    const load = async () => {
      try {
        const [meRes, courses] = await Promise.all([
          getGoalsCached(key, () =>
            GoalAPI.RGoalMe({
              query: {
                school: currentSchool._id,
                season: seasonId,
              },
            })
          ),
          Promise.all([
            SyllabusAPI.RSyllabuses({
              query: { season: seasonId, student: currentUser._id },
            }),
            SyllabusAPI.RSyllabuses({
              query: { season: seasonId, user: currentUser._id },
            }),
            SyllabusAPI.RSyllabuses({
              query: { season: seasonId, teacher: currentUser._id },
            }),
          ]),
        ]);

        if (cancelled) return;

        const d = meRes.display || {};
        const [
          { enrollments: enrolled, syllabuses: syllabusesEnrolled },
          { syllabuses: created },
          { syllabuses: mentoring },
        ] = courses;

        for (const syllabus of syllabusesEnrolled) {
          const idx = _.findIndex(enrolled, { syllabus: syllabus._id });
          if (idx !== -1) enrolled[idx].count = syllabus.count;
        }

        let enrolledEval: any[] = [];
        if (d.enrolled !== false && currentSeason?.formEvaluation?.length) {
          const { enrollments } =
            await EnrollmentAPI.REnrollmentsWithEvaluation({
              query: {
                school: currentRegistration?.school || currentSchool._id,
                student: currentUser._id,
              },
            });
          enrolledEval = enrollments;
        }

        let mentoringEvalCounts: {
          label: string;
          filled: number;
          total: number;
        }[] = [];
        if (
          isTeacher &&
          d.mentoring !== false &&
          mentoring.length > 0 &&
          currentSeason?.formEvaluation?.length
        ) {
          const results = await Promise.all(
            mentoring.map((course: any) =>
              EnrollmentAPI.REnrollmentsWithEvaluation({
                query: { syllabus: course._id },
              })
            )
          );
          mentoringEvalCounts = aggregateMentoringEvaluationCounts({
            formEvaluation: currentSeason.formEvaluation,
            enrollmentResults: results,
          });
        }

        if (cancelled) return;

        const sections: {
          key: string;
          items: TSummaryItem[];
        }[] = [];

        const pushSection = (key: string, raw: TSummaryItem[]) => {
          const items = filterAndApplyTargets(d, key, withItemIds(key, raw));
          if (items.length > 0) sections.push({ key, items });
        };

        if (d.enrolled !== false) {
          pushSection(
            "enrolled",
            computeEnrolledSummary({
              courseList: enrolled,
              formEvaluation: currentSeason?.formEvaluation ?? [],
              evaluationData: enrolledEval,
              maxCredit: currentSeason?.maxCredit ?? 0,
              minCredit: currentSeason?.minCredit ?? 0,
            })
          );
        }
        if (isTeacher && d.created !== false) {
          pushSection("created", computeCreatedSummary(created));
        }
        if (isTeacher && d.mentoring !== false) {
          pushSection(
            "mentoring",
            appendEvaluationSummary(
              computeMentoringBaseSummary(mentoring),
              mentoringEvalCounts,
              "mentoring"
            )
          );
        }
        if (d.archive !== false && meRes.archive) {
          pushSection("archive", computeArchiveSummary(meRes.archive));
        }
        if (d.board !== false && currentSchool.boardEnabled !== false) {
          pushSection("board", computeBoardSummary(meRes.board));
        }

        const nextItems = sections.flatMap((s) =>
          s.items.map((item) => {
            const kind = goalItemKind(s.key);
            const remaining = remainingOf(item);
            return {
              id: item.id as string,
              label: item.label,
              value: item.value,
              current: item.current,
              total: item.total,
              remaining,
              kind,
              href: hrefForGoalItem({
                sectionKey: s.key,
                itemId: item.id,
                label: item.label,
                boardId: item.meta?.boardId,
              }),
            } satisfies TGoalSidebarChip;
          })
        );

        if (!cancelled) {
          setAllItems(nextItems);
          setItemOrder(meRes.display?.itemOrder || []);
        }
      } catch {
        if (!cancelled) {
          setAllItems([]);
          setItemOrder([]);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [
    currentSchool?._id,
    currentSchool?.goalsEnabled,
    currentSchool?.boardEnabled,
    currentUser?._id,
    seasonId,
    isTeacher,
    dataTick,
    currentSeason?._id,
    currentSeason?.formEvaluation,
    currentSeason?.maxCredit,
    currentSeason?.minCredit,
  ]);

  // 사이드바 선택·학교 순서만 반영 (네트워크 재요청 없음)
  useEffect(() => {
    if (!currentSchool?._id || !currentUser?._id) {
      setChips([]);
      return;
    }
    const allIds = allItems
      .map((i) => i.id)
      .filter((id): id is string => !!id);
    const selected = resolveSelectedIds(
      allIds,
      readSelectedGoalItemIds(currentSchool._id, currentUser._id)
    );
    const selectedSet = new Set(selected);
    const selectedItems = allItems.filter(
      (i) => i.id && selectedSet.has(i.id)
    );
    setChips(sortByItemOrder(selectedItems, itemOrder));
  }, [
    allItems,
    itemOrder,
    prefsTick,
    currentSchool?._id,
    currentUser?._id,
  ]);

  const totalRemaining = useMemo(
    () => chips.reduce((sum, c) => sum + (c.remaining || 0), 0),
    [chips]
  );

  const hasContent = chips.length > 0;

  const goGoals = () => {
    navigate("/goals");
    onNavigate?.();
  };

  const toggleCollapsed = () => {
    if (!currentSchool?._id || !currentUser?._id) return;
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsed(currentSchool._id, currentUser._id, next);
  };

  if (
    !currentSchool?._id ||
    currentSchool.goalsEnabled === false ||
    !hasContent
  ) {
    return null;
  }

  if (!open) {
    return (
      <div
        className={style.goals_collapsed}
        onClick={goGoals}
        title="목표"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") goGoals();
        }}
      >
        <span className={style.goals_collapsed_ring}>
          <Svg type="analyze" />
          {totalRemaining > 0 && (
            <span className={style.goals_collapsed_badge}>{totalRemaining}</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className={style.goals_widget}>
      <div className={style.goals_widget_header}>
        <button
          type="button"
          className={style.goals_widget_title}
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          title={collapsed ? "목표 펼치기" : "목표 접기"}
        >
          <span className={style.goals_widget_title_left}>
            <Svg type={collapsed ? "chevronRight" : "chevronDown"} />
            <span>목표</span>
          </span>
          {totalRemaining > 0 ? (
            <span className={style.goals_widget_count}>{totalRemaining}</span>
          ) : (
            <span className={style.goals_widget_count_muted}>{chips.length}</span>
          )}
        </button>
        <button
          type="button"
          className={style.goals_widget_all}
          onClick={goGoals}
          title="목표 전체 보기"
          aria-label="목표 전체 보기"
        >
          <Svg type="openInNew" />
        </button>
      </div>
      {!collapsed && (
        <div className={style.goals_list}>
          {chips.map((c) => {
            const hasBar = c.total != null && c.total > 0;
            const valueText =
              hasBar && c.current != null && c.total != null
                ? `${c.current}/${c.total}`
                : c.value;
            const remaining = c.remaining ?? 0;
            return (
              <button
                type="button"
                key={c.id}
                className={`${style.goals_row} ${kindClass(c.kind)}`}
                onClick={() => {
                  navigate(c.href);
                  onNavigate?.();
                }}
                title={`${c.label} ${valueText}`}
              >
                <span className={style.goals_row_main}>
                  <span className={style.goals_row_label_wrap}>
                    <span className={style.goals_row_label}>{c.label}</span>
                    {remaining > 0 && (
                      <span className={style.goals_row_badge}>{remaining}</span>
                    )}
                  </span>
                  <span className={style.goals_row_value}>{valueText}</span>
                </span>
                {hasBar && (
                  <span className={style.goals_row_track}>
                    <span
                      className={style.goals_row_fill}
                      style={{ width: `${ratioPct(c)}%` }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalsSidebarWidget;
