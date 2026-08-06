import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { buildCourseListChatSnapshot } from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  label: string;
  seasonLabel?: string;
  /** 현재 테이블에 쓰이는(필터 후) 수업 목록 */
  getCourses: () => any[];
  /** 이미 수강 중인 syllabus id (선택) */
  getEnrolledIds?: () => string[];
};

/**
 * 수업 목록/수강신청 화면에서 Navbar Alter chat에 목록 데이터를 등록한다.
 */
const useRegisterAlterCourseList = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getCoursesRef = useRef(params.getCourses);
  const getEnrolledIdsRef = useRef(params.getEnrolledIds);
  getCoursesRef.current = params.getCourses;
  getEnrolledIdsRef.current = params.getEnrolledIds;

  useEffect(() => {
    if (params.enabled === false) return;

    return registerPageContext({
      pageType: "course-list",
      label: params.label,
      getChatSnapshot: () => {
        const courses = getCoursesRef.current() || [];
        const enrolledIds = getEnrolledIdsRef.current?.() || [];
        return buildCourseListChatSnapshot(courses, {
          label: params.label,
          seasonLabel: params.seasonLabel,
          enrolledIds,
        });
      },
      suggestedSkills: ["chat"],
    });
  }, [
    params.enabled,
    params.label,
    params.seasonLabel,
    registerPageContext,
  ]);
};

export default useRegisterAlterCourseList;
