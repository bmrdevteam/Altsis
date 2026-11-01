import { isSchoolManager, TSchoolManagerUser } from "utils/schoolManager";
import { TFormEvaluation } from "types/seasons";

/** 저장 전·구 데이터는 auth·authOption이 빠질 수 있다. */
type TEvalField = {
  label?: string;
  type?: TFormEvaluation[number]["type"];
  options?: string[];
  authOption?: TFormEvaluation[number]["authOption"];
  auth?: {
    edit?: { student?: boolean; teacher?: boolean };
    view?: { student?: boolean; teacher?: boolean };
  };
};

export type TEvalColumn = {
  text: string;
  key: string;
  type: "input" | "input-number" | "select" | "text";
  option?: string[];
  whiteSpace?: "pre-wrap";
  maxLines?: number;
  inputMinHeight?: string;
};

type TCourseTeacher = {
  _id?: unknown;
  userId?: string;
};

type TMentorUser = TSchoolManagerUser & {
  _id?: unknown;
  userId?: string;
};

/**
 * 등록에 복사된 평가 양식이 비어 있으면 학기 양식을 쓴다.
 */
export const resolveFormEvaluation = (
  registrationForm: readonly TEvalField[] | null | undefined,
  seasonForm: readonly TEvalField[] | null | undefined
): TFormEvaluation => {
  if (Array.isArray(registrationForm) && registrationForm.length > 0) {
    return registrationForm as TFormEvaluation;
  }
  return (Array.isArray(seasonForm) ? seasonForm : []) as TFormEvaluation;
};

const readBool = (
  container: { teacher?: boolean; student?: boolean } | undefined,
  key: "teacher" | "student"
): boolean | undefined => {
  if (!container) return undefined;
  const value = container[key];
  if (value === true || value === false) return value;
  return undefined;
};

export const isTeacherEditableField = (
  item: TEvalField | null | undefined
): boolean => {
  if (!item?.label) return false;
  const explicit = readBool(item.auth?.edit, "teacher");
  if (explicit !== undefined) return explicit;
  const option = item.authOption || "editByTeacher";
  return (
    option === "editByTeacher" || option === "editByTeacherAndStudentCanView"
  );
};

export const isStudentViewField = (
  item: TEvalField | null | undefined
): boolean => {
  if (!item?.label) return false;
  const explicit = readBool(item.auth?.view, "student");
  if (explicit !== undefined) return explicit;
  const option = item.authOption || "editByTeacher";
  return (
    option === "editByStudent" || option === "editByTeacherAndStudentCanView"
  );
};

/**
 * 이 수업의 평가를 열 수 있는지.
 * 학교 관리자·아카데미 관리자는 담당 교사 목록이 비어 있어도 연다.
 */
export const isCourseMentor = (
  user: TMentorUser,
  syllabus:
    | { school?: unknown; teachers?: TCourseTeacher[] | null }
    | null
    | undefined,
  schoolRef?: unknown
): boolean => {
  if (isSchoolManager(user, syllabus?.school ?? schoolRef)) return true;
  const meId = user?._id != null ? String(user._id) : "";
  const meLogin = user?.userId ?? "";
  const teacherList = syllabus?.teachers;
  const teachers = Array.isArray(teacherList) ? teacherList : [];
  return teachers.some(
    (teacher) =>
      (meLogin !== "" && teacher?.userId === meLogin) ||
      (meId !== "" && teacher?._id != null && String(teacher._id) === meId)
  );
};

const textColumn = (label: string): TEvalColumn => ({
  text: label,
  key: `evaluation.${label}`,
  type: "text",
  whiteSpace: "pre-wrap",
  maxLines: 4,
});

/**
 * 멘토링 평가 표의 열.
 * canEdit이면 교사 입력 칸을 만들고, 아니면 라벨을 읽기 전용으로 모두 보여 준다.
 */
export const buildMentorEvaluationColumns = (
  formEvaluation: readonly TEvalField[] | null | undefined,
  canEdit: boolean
): TEvalColumn[] => {
  const items = Array.isArray(formEvaluation) ? formEvaluation : [];
  if (!canEdit) {
    return items.flatMap((item) =>
      item?.label ? [textColumn(item.label)] : []
    );
  }

  const columns: TEvalColumn[] = [];
  for (const item of items) {
    if (!item?.label) continue;
    const key = `evaluation.${item.label}`;
    if (isTeacherEditableField(item)) {
      if (item.type === "input-number") {
        columns.push({ text: item.label, key, type: "input-number" });
      } else if (item.type === "select") {
        columns.push({
          text: item.label,
          key,
          type: "select",
          option: item.options,
        });
      } else {
        columns.push({
          text: item.label,
          key,
          type: "input",
          inputMinHeight: "72px",
        });
      }
    } else if (
      isStudentViewField(item) ||
      item.auth?.view?.teacher === true
    ) {
      columns.push(textColumn(item.label));
    }
  }
  return columns;
};
