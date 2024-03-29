/**
 * @namespace APIs._MESSAGE
 */

/**
 * -----------------------------------------
 * 200 Success
 * 요청 성공
 * -----------------------------------------
 */

/**
 * @tag 200 Success
 *
 * @alias LOGIN_SUCCESS
 * @description 로그인 성공
 *
 * @memberof APIs._MESSAGE
 */
export const LOGIN_SUCCESS = "LOGIN_SUCCESS";

/**
 * -----------------------------------------
 * 400 Bad Request
 * 유효하지 않은 요청
 * -----------------------------------------
 */

/**
 * @tag 400 Bad Request
 *
 * @function FIELD_REQUIRED
 * @description 필드 필요함
 * @param {string} field - 필요한 필드명
 *
 * @memberof APIs._MESSAGE
 */
export const FIELD_REQUIRED = (field) => `${field.toUpperCase()}_REQUIRED`;

/**
 * @tag 400 Bad Request
 *
 * @function FIELD_INVALID
 * @description 필드가 유효하지 않음
 * @param {string} field - 유효하지 않은 필드명
 *
 * @memberof APIs._MESSAGE
 */
export const FIELD_INVALID = (field) => `${field.toUpperCase()}_INVALID`;

/**
 * @tag 400 Bad Request
 *
 * @alias FORM_LABEL_DUPLICATED
 * @description form의 label이 중복됨
 *
 * @memberof APIs._MESSAGE
 */
export const FORM_LABEL_DUPLICATED = "FORM_LABEL_DUPLICATED";

/**
 * -----------------------------------------
 * 401 Unauthorized
 * 사용자 검증 실패
 * -----------------------------------------
 */

/**
 * @tag 401 Unauthorized
 *
 * @alias ACADEMY_INACTIVATED
 * @description 아카데미가 비활성화됨
 *
 * @memberof APIs._MESSAGE
 */
export const ACADEMY_INACTIVATED = "ACADEMY_INACTIVATED";

/**
 * @tag 401 Unauthorized
 *
 * @alias PASSWORD_INCORRECT
 * @description 비밀번호 틀림
 *
 * @memberof APIs._MESSAGE
 */
export const PASSWORD_INCORRECT = "PASSWORD_INCORRECT";

/**
 * -----------------------------------------
 * 403 Forbidden
 * 사용자 접근 거부
 * -----------------------------------------
 */

/**
 * @tag 403 Forbidden
 *
 * @alias NOT_LOGGED_IN
 *
 * @memberof APIs._MESSAGE
 */
export const NOT_LOGGED_IN = "NOT_LOGGED_IN";

/**
 * @tag 403 Forbidden
 *
 * @alias ALREADY_LOGGED_IN
 *
 * @memberof APIs._MESSAGE
 */
export const ALREADY_LOGGED_IN = "ALREADY_LOGGED_IN";

/**
 * @tag 403 Forbidden
 *
 * @alias PERMISSION_DENIED
 *
 * @memberof APIs._MESSAGE
 */
export const PERMISSION_DENIED = "PERMISSION_DENIED";

/**
 * @tag 403 Forbidden
 *
 * @alias SYLLABUS_CONFIRMED_ALREADY
 * @description 승인이 완료된 강의계획서는 수정할 수 없음
 *
 * @memberof APIs._MESSAGE
 */
export const SYLLABUS_CONFIRMED_ALREADY = "SYLLABUS_CONFIRMED_ALREADY";

/**
 * @tag 403 Forbidden
 *
 * @alias SYLLABUS_IS_ENROLLED
 * @description 수강생이 있는 강의계획서는 수정할 수 없음
 *
 * @memberof APIs._MESSAGE
 */
export const SYLLABUS_ENROLLED_ALREADY = "SYLLABUS_ENROLLED_ALREADY";

/**
 * -----------------------------------------
 * 404 Not Found
 * 리소스 없음
 * -----------------------------------------
 */

/**
 * @tag 404 Not Found
 *
 * @function __NOT_FOUND
 * @param {string} field - 찾지 못한 필드명
 *
 * @memberof APIs._MESSAGE
 */
export const __NOT_FOUND = (field) => `${field.toUpperCase()}_NOT_FOUND`;

/**
 * -----------------------------------------
 * 409 Conflict
 * 허용할 수 없는 요청
 * -----------------------------------------
 */

/**
 * @tag 409 Conflict
 *
 * @function _FIELD_IN_USE
 * @description 사용 중인 필드
 * @param {string} field - 사용 중인 필드명
 *
 * @memberof APIs._MESSAGE
 */
export const FIELD_IN_USE = (field) => `${field.toUpperCase()}_IN_USE`;

/**
 * @tag 409 Conflict
 *
 * @function CONNECTED_ALREADY
 * @description 이미 연결된 필드
 * @param {string} field - 연결된 필드명
 *
 * @memberof APIs._MESSAGE
 */
export const CONNECTED_ALREADY = (field) =>
  `${field.toUpperCase()}_CONNECTED_ALREADY`;

/**
 * @tag 409 Conflict
 *
 * @function DISCONNECTED_ALREADY
 * @description 이미 해제된 필드
 * @param {string} field - 해제된 필드명
 *
 * @memberof APIs._MESSAGE
 */
export const DISCONNECTED_ALREADY = (field) =>
  `${field.toUpperCase()}_DISCONNECTED_ALREADY`;

/**
 * @tag 409 Conflict
 *
 * @alias LIMIT_FILE_SIZE
 * @description 파일 사이즈가 커서 업로드할 수 없음
 *
 * @memberof APIs._MESSAGE
 */
export const LIMIT_FILE_SIZE = "LIMIT_FILE_SIZE";

/**
 * @tag 409 Conflict
 *
 * @alias INVALID_FILE_TYPE
 * @description 파일 형식이 맞지 않아 업로드할 수 없음
 *
 * @memberof APIs._MESSAGE
 */
export const INVALID_FILE_TYPE = "INVALID_FILE_TYPE";

/**
 * @tag 409 Conflict
 *
 * @alias SEASON_ALREADY_ACTIVATED_FIRST
 * @description 한 번 활성화된 학기임
 *
 * @memberof APIs._MESSAGE
 */
export const SEASON_ALREADY_ACTIVATED_FIRST = "SEASON_ALREADY_ACTIVATED_FIRST";

/**
 * @tag 409 Conflict
 *
 * @alias REGISTRATION_IN_USE
 * @description 이미 등록 정보가 있음
 *
 * @memberof APIs._MESSAGE
 */
export const REGISTRATION_IN_USE = "REGISTRATION_IN_USE";

/**
 * @tag 409 Conflict
 *
 * @alias CLASSROOM_IN_USE
 * @description 이미 사용 중인 강의실임
 *
 * @memberof APIs._MESSAGE
 */
export const CLASSROOM_IN_USE = "CLASSROOM_IN_USE";

/**
 * @tag 409 Conflict
 *
 * @alias SYLLABUS_COUNT_EXCEEDS_LIMIT
 * @description syllabus.limit이 syllabus.count를 초과함
 *
 * @memberof APIs._MESSAGE
 */
export const SYLLABUS_COUNT_EXCEEDS_LIMIT = "SYLLABUS_COUNT_EXCEEDS_LIMIT";

/**
 * @tag 409 Conflict
 *
 * @alias STUDENTS_FULL
 * @description 수강정원이 다 찼음
 *
 * @memberof APIs._MESSAGE
 */
export const STUDENTS_FULL = "STUDENTS_FULL";

/**
 * @tag 409 Conflict
 *
 * @alias TIME_DUPLICATED
 * @description 시간표가 중복됨
 *
 * @memberof APIs._MESSAGE
 */
export const TIME_DUPLICATED = "TIME_DUPLICATED";

/**
 * @tag 409 Conflict
 *
 * @alias SYLLABUS_NOT_CONFIRMED
 * @description 승인되지 않은 강의계획서임
 *
 * @memberof APIs._MESSAGE
 */
export const SYLLABUS_NOT_CONFIRMED = "SYLLABUS_NOT_CONFIRMED";
