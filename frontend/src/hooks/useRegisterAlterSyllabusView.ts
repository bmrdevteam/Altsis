import { useEffect, useRef } from "react";
import { useAlter } from "contexts/alterContext";
import { buildSyllabusViewChatSnapshot } from "utils/alterChatSnapshot";

type Params = {
  enabled?: boolean;
  course: any;
  formSyllabus?: any;
};

/**
 * 강의계획서 상세(읽기) 화면에서 Navbar Alter chat에 문맥을 등록한다.
 * draft/apply 스킬은 붙이지 않고 기본 chat만 사용한다.
 */
const useRegisterAlterSyllabusView = (params: Params) => {
  const { registerPageContext } = useAlter();
  const courseRef = useRef(params.course);
  courseRef.current = params.course;

  const classTitle = String(params.course?.classTitle || "");
  const subjectKey = Array.isArray(params.course?.subject)
    ? params.course.subject.join("/")
    : "";

  useEffect(() => {
    if (params.enabled === false) return;
    if (!params.course) return;

    const title = String(params.course.classTitle || "");
    const subject = Array.isArray(params.course.subject)
      ? params.course.subject
      : [];

    return registerPageContext({
      pageType: "syllabus",
      label: title ? `강의계획서 · ${title}` : "강의계획서",
      subject,
      classTitle: title,
      getChatSnapshot: () =>
        buildSyllabusViewChatSnapshot(
          courseRef.current || params.course,
          params.formSyllabus
        ),
      suggestedSkills: ["chat"],
    });
  }, [
    params.enabled,
    params.formSyllabus,
    classTitle,
    subjectKey,
    params.course,
    registerPageContext,
  ]);
};

export default useRegisterAlterSyllabusView;
