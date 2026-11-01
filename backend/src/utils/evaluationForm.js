/**
 * 학기 평가 양식과 등록 스냅샷 중 실제로 쓸 항목을 고른다.
 * 등록 쪽 빈 배열은 양식이 없는 것이 아니라 동기화 전 상태일 수 있다.
 *
 * @param {unknown} registrationForm
 * @param {unknown} seasonForm
 * @returns {object[]}
 */
export const resolveFormEvaluation = (registrationForm, seasonForm) => {
  if (Array.isArray(registrationForm) && registrationForm.length > 0) {
    return registrationForm;
  }
  return Array.isArray(seasonForm) ? seasonForm : [];
};

/**
 * @param {object | null | undefined} container
 * @param {string} key
 * @returns {boolean | undefined}
 */
const readBool = (container, key) => {
  if (!container || typeof container !== "object") return undefined;
  const value = container[key];
  if (value === true || value === false) return value;
  return undefined;
};

/**
 * 교사 입력 칸인지. auth.edit.teacher가 없으면 authOption(기본 교사 입력)으로 본다.
 *
 * @param {object | null | undefined} item
 * @returns {boolean}
 */
export const isTeacherEditableField = (item) => {
  if (!item?.label) return false;
  const explicit = readBool(item.auth?.edit, "teacher");
  if (explicit !== undefined) return explicit;
  const option = item.authOption || "editByTeacher";
  return (
    option === "editByTeacher" ||
    option === "editByTeacherAndStudentCanView"
  );
};

/**
 * 학생 입력 칸인지.
 *
 * @param {object | null | undefined} item
 * @returns {boolean}
 */
export const isStudentEditableField = (item) => {
  if (!item?.label) return false;
  const explicit = readBool(item.auth?.edit, "student");
  if (explicit !== undefined) return explicit;
  return item.authOption === "editByStudent";
};

/**
 * 학생이 볼 수 있는 칸인지. 교사 화면의 읽기 전용 열에 쓴다.
 *
 * @param {object | null | undefined} item
 * @returns {boolean}
 */
export const isStudentViewField = (item) => {
  if (!item?.label) return false;
  const explicit = readBool(item.auth?.view, "student");
  if (explicit !== undefined) return explicit;
  const option = item.authOption || "editByTeacher";
  return (
    option === "editByStudent" ||
    option === "editByTeacherAndStudentCanView"
  );
};
