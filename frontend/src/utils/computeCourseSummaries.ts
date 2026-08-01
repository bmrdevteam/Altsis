import _ from "lodash";

export type TSummaryItem = {
  /** sectionKey:label — 사이드바 선택용 */
  id?: string;
  label: string;
  value: string;
  warning?: boolean;
  /** 있으면 fill bar로 표시 (current/total) */
  current?: number;
  total?: number;
  /** 링크용 부가 정보 (예: boardId) */
  meta?: { boardId?: string };
};

export type TEvaluationCount = {
  label: string;
  count?: number;
  filled?: number;
  total?: number;
};

export function withItemIds(
  sectionKey: string,
  items: TSummaryItem[]
): TSummaryItem[] {
  return items.map((item) => ({
    ...item,
    id: item.id || `${sectionKey}:${item.label}`,
  }));
}

/**
 * Enrolled List와 동일한 수강 요약
 */
export function computeEnrolledSummary(params: {
  courseList: any[];
  formEvaluation?: any[];
  evaluationData?: any[];
  maxCredit?: number;
  minCredit?: number;
}): TSummaryItem[] {
  const {
    courseList,
    formEvaluation = [],
    evaluationData = [],
    maxCredit = 0,
    minCredit = 0,
  } = params;

  const totalCourses = courseList.length;
  const totalPoint = courseList.reduce(
    (acc, cur) => acc + (parseInt(cur.point, 10) || 0),
    0
  );
  const totalTimeSlots = courseList.reduce(
    (acc, cur) => acc + (cur.time?.length || 0),
    0
  );

  const visibleFields = formEvaluation.filter(
    (f: any) => f.auth?.view?.student
  );
  const evalMap = _.keyBy(evaluationData, "_id");

  const evaluationCounts: { label: string; count: number }[] = [];
  for (const field of visibleFields) {
    let count = 0;
    for (const course of courseList) {
      const evalEntry = evalMap[course._id];
      if (evalEntry?.evaluation?.[field.label]?.toString().trim()) {
        count++;
      }
    }
    evaluationCounts.push({ label: field.label, count });
  }

  const isOverMaxCredit = maxCredit > 0 && totalPoint > maxCredit;

  return [
    { label: "수강 과목", value: `${totalCourses}과목` },
    {
      label: "총 학점",
      value: `${totalPoint}학점`,
      warning: isOverMaxCredit,
    },
    ...(maxCredit > 0
      ? [{ label: "최대", value: `${maxCredit}`, warning: isOverMaxCredit }]
      : []),
    ...(minCredit > 0 ? [{ label: "최소", value: `${minCredit}` }] : []),
    { label: "주간 수업 시수", value: `${totalTimeSlots}시수` },
    ...evaluationCounts.map((ec) => ({
      id: `enrolled:eval:${ec.label}`,
      label: ec.label,
      value: `${ec.count}/${totalCourses}`,
      current: ec.count,
      total: totalCourses,
    })),
  ];
}

/**
 * Created List와 동일한 개설 수업 요약
 */
export function computeCreatedSummary(courseList: any[]): TSummaryItem[] {
  const totalCourses = courseList.length;
  const totalPoint = courseList.reduce(
    (acc, cur) => acc + (cur.point || 0),
    0
  );
  const totalStudents = courseList.reduce(
    (acc, cur) => acc + (cur.count || 0),
    0
  );
  const totalLimit = courseList.reduce(
    (acc, cur) => acc + (cur.limit || 0),
    0
  );
  const confirmedCount = courseList.filter(
    (course) =>
      course.teachers?.length > 0 &&
      course.teachers.every((t: any) => t.confirmed)
  ).length;

  return [
    { label: "개설 수업", value: `${totalCourses}개` },
    { label: "총 학점", value: `${totalPoint}학점` },
    { label: "총 수강생", value: `${totalStudents}명` },
    { label: "총 정원", value: `${totalLimit}명` },
    {
      label: "승인 완료",
      value: `${confirmedCount}/${totalCourses}`,
      current: confirmedCount,
      total: totalCourses,
    },
  ];
}

/**
 * Mentoring List 기본 요약 (+ 평가 counts는 호출측에서 합침)
 */
export function computeMentoringBaseSummary(courseList: any[]): TSummaryItem[] {
  const totalCourses = courseList.length;
  const totalPoint = courseList.reduce(
    (acc, cur) => acc + (cur.point || 0),
    0
  );
  const totalStudents = courseList.reduce(
    (acc, cur) => acc + (cur.count || 0),
    0
  );
  const totalLimit = courseList.reduce(
    (acc, cur) => acc + (cur.limit || 0),
    0
  );
  const confirmedCount = courseList.filter(
    (course) =>
      course.teachers?.length > 0 &&
      course.teachers.every((t: any) => t.confirmed)
  ).length;

  return [
    { label: "담당 수업", value: `${totalCourses}개` },
    { label: "총 학점", value: `${totalPoint}학점` },
    { label: "총 수강생", value: `${totalStudents}명` },
    { label: "총 정원", value: `${totalLimit}명` },
    {
      label: "승인 완료",
      value: `${confirmedCount}/${totalCourses}`,
      current: confirmedCount,
      total: totalCourses,
    },
  ];
}

export function appendEvaluationSummary(
  base: TSummaryItem[],
  evaluationCounts: { label: string; filled: number; total: number }[],
  section: "enrolled" | "mentoring" = "mentoring"
): TSummaryItem[] {
  return [
    ...base,
    ...evaluationCounts.map((ec) => ({
      id: `${section}:eval:${ec.label}`,
      label: ec.label,
      value: `${ec.filled}/${ec.total}`,
      current: ec.filled,
      total: ec.total,
    })),
  ];
}

/**
 * Mentoring List의 평가 집계 (여러 수업 enrollments 결과)
 */
export function aggregateMentoringEvaluationCounts(params: {
  formEvaluation: any[];
  enrollmentResults: { enrollments: any[] }[];
}): { label: string; filled: number; total: number }[] {
  const { formEvaluation, enrollmentResults } = params;
  if (!formEvaluation.length) return [];

  let totalStudents = 0;
  const counts: Record<string, number> = {};
  for (const field of formEvaluation) {
    counts[field.label] = 0;
  }

  for (const { enrollments } of enrollmentResults) {
    totalStudents += enrollments.length;
    for (const enrollment of enrollments) {
      for (const field of formEvaluation) {
        if (enrollment.evaluation?.[field.label]?.toString().trim()) {
          counts[field.label]++;
        }
      }
    }
  }

  return formEvaluation.map((field: any) => ({
    label: field.label,
    filled: counts[field.label],
    total: totalStudents,
  }));
}

/**
 * 보드 진행도 → 요약
 * - 전체 할 일: 이미 한 일 / 총 해야 할 일
 * - 양식: 제출 수 / 제출해야 할 수
 */
export function computeBoardSummary(board?: {
  submitted?: number;
  total?: number;
  forms?: {
    formId: string;
    boardId?: string;
    title: string;
    submitted: number;
    required: number;
  }[];
} | null): TSummaryItem[] {
  const submitted = board?.submitted ?? 0;
  const total = board?.total ?? 0;
  return [
    {
      id: "board:전체 할 일",
      label: "전체 할 일",
      value: `${submitted}/${total}`,
      current: submitted,
      total,
    },
    ...(board?.forms || []).map((f) => ({
      id: `board:form:${f.formId}`,
      label: f.title || "양식",
      value: `${f.submitted}/${f.required}`,
      current: f.submitted,
      total: f.required,
      meta: f.boardId ? { boardId: f.boardId } : undefined,
    })),
  ];
}

/** archive counts → summary items (object는 0/1 fill bar) */
export function computeArchiveSummary(
  archive: { label: string; count: number; dataType?: string }[]
): TSummaryItem[] {
  return archive.map((a) => {
    const id = `archive:${a.label}`;
    if (a.dataType === "array" || a.count > 1) {
      return { id, label: a.label, value: `${a.count}건` };
    }
    return {
      id,
      label: a.label,
      value: a.count > 0 ? "입력됨" : "미입력",
      current: a.count > 0 ? 1 : 0,
      total: 1,
    };
  });
}
