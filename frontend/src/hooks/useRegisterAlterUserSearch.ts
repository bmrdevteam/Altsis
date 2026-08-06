import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import {
  buildUserSearchChatSnapshot,
  TAlterSubjectUser,
} from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  tabLabel: string;
  seasonLabel?: string;
  user: TAlterSubjectUser | null | undefined;
  getCourses: () => any[];
  includeTimetableSlots?: boolean;
};

/**
 * 학생/사용자 조회 화면의 프로필·수업·시간표 데이터를 Alter chat에 등록한다.
 */
const useRegisterAlterUserSearch = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getCoursesRef = useRef(params.getCourses);
  const userRef = useRef(params.user);
  getCoursesRef.current = params.getCourses;
  userRef.current = params.user;

  const userKey = [
    params.user?.userName,
    params.user?.userId,
    params.user?.role,
  ].join("|");

  useEffect(() => {
    if (params.enabled === false || !params.user) return;

    return registerPageContext({
      pageType: "course-list",
      label: `${params.user.userName || "사용자"} · ${params.tabLabel}`,
      getChatSnapshot: () =>
        buildUserSearchChatSnapshot({
          tabLabel: params.tabLabel,
          seasonLabel: params.seasonLabel,
          user: userRef.current || {},
          courses: getCoursesRef.current() || [],
          includeTimetableSlots: !!params.includeTimetableSlots,
        }),
      suggestedSkills: ["chat"],
    });
  }, [
    params.enabled,
    params.tabLabel,
    params.seasonLabel,
    params.includeTimetableSlots,
    userKey,
    registerPageContext,
  ]);
};

export default useRegisterAlterUserSearch;
