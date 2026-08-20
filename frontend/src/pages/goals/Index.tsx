import Loading from "components/loading/Loading";
import { useAuth } from "contexts/authContext";
import useAPIv2, { ALERT_ERROR } from "hooks/useAPIv2";
import { useAppNavigate } from "hooks/useAppNavigate";
import _ from "lodash";
import { useEffect, useMemo, useState } from "react";
import { TGoalsMe } from "types/goals";
import {
  appendEvaluationSummary,
  computeArchiveSummary,
  computeBoardSummary,
  computeCreatedSummary,
  computeEnrolledSummary,
  computeMentoringBaseSummary,
  TSummaryItem,
  aggregateMentoringEvaluationCounts,
  withItemIds,
} from "utils/computeCourseSummaries";
import { filterAndApplyTargets } from "./goalItemCatalog";
import {
  getGoalsCached,
  goalsCacheKey,
  subscribeGoalsCacheInvalidation,
} from "./goalsCache";
import {
  readSelectedGoalItemIds,
  resolveSelectedIds,
  writeSelectedGoalItemIds,
} from "./goalSidebarPrefs";
import {
  canManageSchoolGoals,
  schoolGoalsSettingsPath,
} from "./goalSidebarVisibility";
import style from "./goals.module.scss";

type Section = {
  key: string;
  title: string;
  href: string;
  items: TSummaryItem[];
};

const ratioPct = (item: TSummaryItem) => {
  if (item.total == null || item.total <= 0 || item.current == null) return 0;
  return Math.min(100, Math.round((item.current / item.total) * 100));
};

const GoalsDashboard = () => {
  const { GoalAPI, SyllabusAPI, EnrollmentAPI } = useAPIv2();
  const {
    currentSchool,
    currentSeason,
    currentRegistration,
    currentUser,
  } = useAuth();
  const navigate = useAppNavigate();

  const seasonId =
    currentRegistration?.season || currentSeason?._id || undefined;
  const isTeacher = currentRegistration?.role === "teacher";

  const [me, setMe] = useState<TGoalsMe | null>(null);
  const [enrolledList, setEnrolledList] = useState<any[]>([]);
  const [createdList, setCreatedList] = useState<any[]>([]);
  const [mentoringList, setMentoringList] = useState<any[]>([]);
  const [enrolledEval, setEnrolledEval] = useState<any[]>([]);
  const [mentoringEvalCounts, setMentoringEvalCounts] = useState<
    { label: string; filled: number; total: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dataTick, setDataTick] = useState(0);

  const cacheKey =
    currentSchool?._id && currentUser?._id
      ? goalsCacheKey(currentSchool._id, seasonId, currentUser._id)
      : "";

  useEffect(
    () => subscribeGoalsCacheInvalidation(() => setDataTick((n) => n + 1)),
    []
  );

  useEffect(() => {
    if (
      !currentSchool?._id ||
      currentSchool.goalsEnabled === false ||
      !currentUser?._id ||
      !seasonId
    ) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const [meRes, courses] = await Promise.all([
          getGoalsCached(cacheKey, () =>
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

        const [
          { enrollments: enrolled, syllabuses: syllabusesEnrolled },
          { syllabuses: created },
          { syllabuses: mentoring },
        ] = courses;

        for (const syllabus of syllabusesEnrolled) {
          const idx = _.findIndex(enrolled, { syllabus: syllabus._id });
          if (idx !== -1) {
            enrolled[idx].count = syllabus.count;
          }
        }

        setMe(meRes);
        setEnrolledList(enrolled);
        setCreatedList(created);
        setMentoringList(mentoring);

        if (
          meRes.display?.enrolled !== false &&
          currentSeason?.formEvaluation?.length
        ) {
          const { enrollments } =
            await EnrollmentAPI.REnrollmentsWithEvaluation({
              query: {
                school: currentRegistration?.school || currentSchool._id,
                student: currentUser._id,
              },
            });
          if (!cancelled) setEnrolledEval(enrollments);
        }

        if (
          isTeacher &&
          meRes.display?.mentoring !== false &&
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
          if (!cancelled) {
            setMentoringEvalCounts(
              aggregateMentoringEvaluationCounts({
                formEvaluation: currentSeason.formEvaluation,
                enrollmentResults: results,
              })
            );
          }
        }
      } catch (err) {
        if (!cancelled) ALERT_ERROR(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [
    currentSchool?._id,
    currentSchool?.goalsEnabled,
    currentUser?._id,
    seasonId,
    isTeacher,
    dataTick,
    currentSeason?._id,
    currentSeason?.formEvaluation,
    currentSeason?.maxCredit,
    currentSeason?.minCredit,
  ]);

  const sections: Section[] = useMemo(() => {
    if (!me) return [];
    const d = me.display || {};
    const list: Section[] = [];

    const pushIfItems = (
      key: string,
      title: string,
      href: string,
      items: TSummaryItem[]
    ) => {
      const filtered = filterAndApplyTargets(
        d,
        key,
        withItemIds(key, items)
      );
      if (filtered.length === 0) return;
      list.push({ key, title, href, items: filtered });
    };

    if (d.enrolled !== false) {
      pushIfItems(
        "enrolled",
        "수강 현황",
        "/courses#수강 현황",
        computeEnrolledSummary({
          courseList: enrolledList,
          formEvaluation: currentSeason?.formEvaluation ?? [],
          evaluationData: enrolledEval,
          maxCredit: currentSeason?.maxCredit ?? 0,
          minCredit: currentSeason?.minCredit ?? 0,
        })
      );
    }

    if (isTeacher && d.created !== false) {
      pushIfItems(
        "created",
        "개설 수업",
        "/courses#개설 수업",
        computeCreatedSummary(createdList)
      );
    }

    if (isTeacher && d.mentoring !== false) {
      pushIfItems(
        "mentoring",
        "담당 수업",
        "/courses#담당 수업",
        appendEvaluationSummary(
          computeMentoringBaseSummary(mentoringList),
          mentoringEvalCounts
        )
      );
    }

    if (d.archive !== false && me.archive) {
      pushIfItems(
        "archive",
        "기록",
        "/myArchive",
        computeArchiveSummary(me.archive)
      );
    }

    if (d.board !== false && currentSchool?.boardEnabled !== false) {
      pushIfItems(
        "board",
        "보드",
        "/boards#할 일",
        computeBoardSummary(me.board)
      );
    }

    return list;
  }, [
    me,
    enrolledList,
    createdList,
    mentoringList,
    enrolledEval,
    mentoringEvalCounts,
    isTeacher,
    currentSeason,
    currentSchool?.boardEnabled,
  ]);

  const allItemIds = useMemo(
    () =>
      sections.flatMap((s) =>
        s.items.map((i) => i.id).filter((id): id is string => !!id)
      ),
    [sections]
  );

  useEffect(() => {
    if (!currentSchool?._id || !currentUser?._id || allItemIds.length === 0) {
      return;
    }
    const stored = readSelectedGoalItemIds(
      currentSchool._id,
      currentUser._id
    );
    setSelectedIds(resolveSelectedIds(allItemIds, stored));
  }, [currentSchool?._id, currentUser?._id, allItemIds.join("|")]);

  const toggleItem = (id: string) => {
    if (!currentSchool?._id || !currentUser?._id) return;
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      writeSelectedGoalItemIds(currentSchool._id, currentUser._id, next);
      return next;
    });
  };

  if (currentSchool?.goalsEnabled === false) {
    const showSettings =
      canManageSchoolGoals(currentUser?.auth) && !!currentSchool._id;
    return (
      <div className={style.page}>
        <div className={style.header}>
          <h1 className={style.title}>목표</h1>
        </div>
        <div className={style.empty}>
          이 학교에서는 목표 기능을 사용하지 않습니다.
          {showSettings && (
            <button
              type="button"
              className={style.emptyAction}
              onClick={() =>
                navigate(schoolGoalsSettingsPath(currentSchool._id))
              }
            >
              학교 설정에서 다시 켜기
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <Loading />;

  if (!currentRegistration) {
    return (
      <div className={style.page}>
        <div className={style.header}>
          <h1 className={style.title}>목표</h1>
        </div>
        <div className={style.empty}>등록된 학기가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className={style.page}>
      <div className={style.header}>
        <h1 className={style.title}>목표</h1>
        {allItemIds.length > 0 && (
          <span className={style.selectedCount}>
            사이드바 {selectedIds.length}/{allItemIds.length}
          </span>
        )}
      </div>
      <p className={style.description}>
        카드를 눌러 사이드바에 표시할 항목을 고르세요. 섹션 제목은 해당
        화면으로 이동합니다.
      </p>

      {sections.length === 0 ? (
        <div className={style.empty}>표시할 목표 항목이 없습니다.</div>
      ) : (
        sections.map((section) => (
          <section key={section.key} className={style.sectionCard}>
            <button
              type="button"
              className={style.sectionTitleBtn}
              onClick={() => navigate(section.href)}
            >
              <span className={style.sectionTitleText}>{section.title}</span>
              <span className={style.sectionLinkHint}>바로가기 →</span>
            </button>
            <div className={style.itemGrid}>
              {section.items.map((item) => {
                const id = item.id || `${section.key}:${item.label}`;
                const selected = selectedIds.includes(id);
                const hasBar = item.total != null && item.total > 0;
                const pct = ratioPct(item);
                return (
                  <button
                    type="button"
                    key={id}
                    className={`${style.itemCard}${
                      selected ? ` ${style.itemCardSelected}` : ""
                    }${item.warning ? ` ${style.itemCardWarning}` : ""}`}
                    onClick={() => toggleItem(id)}
                    aria-pressed={selected}
                    title={
                      selected
                        ? "사이드바에서 숨기기"
                        : "사이드바에 표시하기"
                    }
                  >
                    <div className={style.itemHeader}>
                      <span className={style.itemLabel}>{item.label}</span>
                      <span className={style.itemCheck} aria-hidden />
                    </div>
                    {hasBar && item.current != null && item.total != null ? (
                      <>
                        <span
                          className={`${style.itemValue} ${style.itemValueRatio}`}
                        >
                          {item.current}
                          <span className={style.slash}>/</span>
                          {item.total}
                        </span>
                        <div className={style.barMeta}>
                          <div className={style.barTrack} style={{ flex: 1 }}>
                            <div
                              className={style.barFill}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className={style.barPct}>{pct}%</span>
                        </div>
                      </>
                    ) : (
                      <span className={style.itemValue}>{item.value}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
};

export default GoalsDashboard;
