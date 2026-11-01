import _ from "lodash";

/**
 * 수업 목록 표에 그릴 행. 원본 수업 객체는 바꾸지 않고, _id·수업명은 유지한다.
 * time·teachers가 없어도 이전 목록을 남기지 않도록 빈 문자열로 둔다.
 */
export function structureCourseRows(data: any[], subjectLabels: string[]) {
  const labels = Array.isArray(subjectLabels) ? subjectLabels : [];
  const rows = (Array.isArray(data) ? data : []).map((syllabus: any) => {
    const next = { ...(syllabus ?? {}) };
    const subject = Array.isArray(syllabus?.subject) ? syllabus.subject : [];
    for (let idx = 0; idx < labels.length; idx++) {
      const label = labels[idx];
      if (!label || label === "_id" || label === "classTitle") continue;
      next[label] = subject[idx];
    }

    const times = Array.isArray(syllabus?.time) ? syllabus.time : [];
    next.timeText = _.join(
      times
        .map((timeBlock: any) => timeBlock?.label)
        .filter((label: unknown) => label != null && label !== ""),
      ", "
    );

    const teachers = Array.isArray(syllabus?.teachers) ? syllabus.teachers : [];
    next.mentorText = _.join(
      teachers
        .map((teacher: any) => teacher?.userName)
        .filter((name: unknown) => name != null && name !== ""),
      ", "
    );

    let confirmed = true;
    for (const teacher of teachers) {
      if (!teacher?.confirmed) {
        confirmed = false;
        break;
      }
    }
    next.confirmed = confirmed;

    const confirmedCnt = teachers.filter((teacher: any) => teacher?.confirmed)
      .length;
    next.confirmedStatus =
      confirmedCnt === 0
        ? "notConfirmed"
        : confirmedCnt === teachers.length
          ? "fullyConfirmed"
          : "semiConfirmed";

    if (!next.count_limit) {
      next.count_limit = `${syllabus?.count || 0}/${syllabus?.limit}`;
    }

    return next;
  });

  return _.sortBy(rows, ["subject", "classTitle"]);
}
