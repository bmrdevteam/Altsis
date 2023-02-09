/**
 * @file useApi hook
 *
 * database api hook using useDatabase
 *
 * @author seedlessapple <luminousseedlessapple@gmail.com>
 *
 * -------------------------------------------------------
 *
 * IN PRODUCTION
 * - useApi hook
 *
 * -------------------------------------------------------
 *
 * IN MAINTENANCE
 *
 * -------------------------------------------------------
 *
 * IN DEVELOPMENT
 *
 * -------------------------------------------------------
 *
 * DEPRECATED
 *
 * -------------------------------------------------------
 *
 * NOTES
 *
 */

import useDatabase from "hooks/useDatabase";
import _ from "lodash";
export default function useApi() {
  const database = useDatabase();

  /**
   * API FUNCTIONS
   */
  function QUERY_BUILDER(params?: object) {
    let query = "";
    if (params) {
      query = "?";
      for (const [key, value] of Object.entries(params)) {
        query = query.concat(`${key}=${value}&`);
      }
    }
    return query;
  }

  function QUERY_SUB_BUILDER(params: string[] | string) {
    return _.join(params, ",");
  }

  /**
   * Academy Api
   * ##########################################################################
   */
  /**
   * Create Academy
   * @auth owner
   */
  async function CAcademy(props: {
    data: {
      academyId: string;
      academyName: string;
      adminId: string;
      adminName: string;
      email?: string;
      tel?: string;
    };
  }) {
    return await database.C({
      location: `academies`,
      data: props.data,
    });
  }
  /**
   * Get Academies
   * @type GET
   * @auth guest
   * @returns list of academies
   */
  async function RAcademies() {
    const { academies: result } = await database.R({ location: "academies" });
    return result;
  }
  /**
   * Get Academy
   * @type GET
   * @auth owner
   * @returns academy
   */
  async function RAcademy(props: { academyId?: string }) {
    return await database.R({
      location: `academies/${props.academyId}`,
    });
  }
  /**
   * Update Academy
   * @type PUT
   * @auth owner
   */
  async function UAcademy(props: {
    academyId: string;
    data: { email: string; tel: string };
  }) {
    return await database.U({
      location: `academies/${props.academyId}`,
      data: props.data,
    });
  }
  /**
   * Activate Academy
   * @type PUT
   * @auth owner
   */
  async function UActivateAcademy(props: { academyId: string }) {
    return await database.U({
      location: `academies/${props.academyId}/activate`,
      data: {},
    });
  }
  /**
   * Inactivate Academy
   * @type PUT
   * @auth owner
   */
  async function UInactivateAcademy(props: { academyId: string }) {
    return await database.U({
      location: `academies/${props.academyId}/inactivate`,
      data: {},
    });
  }

  /**
   * Create Academy document(users, schools, seasons, registrations)
   * @type PUT
   * @auth owner
   */
  async function CAcademyDocument(props: {
    academyId: string;
    type: "users" | "schools" | "seasons" | "registrations";
    data: any;
  }) {
    return await database.C({
      location: `academies/${props.academyId}/${props.type}`,
      data: props.data,
    });
  }

  /**
   * User Api
   * ##########################################################################
   */
  /**
   * local login
   * @type POST
   * @auth guest
   */
  async function CLoginLocal(data: {
    academyId: string;
    userId: string;
    password: string;
    persist?: boolean;
  }) {
    return await database.C({ location: "users/login/local", data: data });
  }

  /**
   * Google login
   * @type POST
   * @auth member
   */
  async function CGoogleLocal(data: {
    academyId: string;
    credential: string;
    persist?: boolean;
  }) {
    return await database.C({ location: "users/login/google", data: data });
  }
  /**
   * Google login
   * @type POST
   * @auth member
   */
  async function DGoogleLocal() {
    return await database.D({ location: "users/google" });
  }

  /**
   * Connect Google login to user
   * @type POST
   * @auth member
   */
  async function CConnectGoogle(data: {
    academyId: string;
    credential: string;
    persist?: boolean;
  }) {
    return await database.C({ location: "users/login/google", data: data });
  }

  /**
   * Get user Logged In
   * @type GET
   * @auth member
   * @returns LoggedIn User
   */
  async function RMySelf() {
    return await database.R({ location: "users/current" });
  }

  /**
   * Logout user
   * @type GET
   * @auth member
   * @returns Logout user
   */
  async function RLogout() {
    return await database.R({ location: "users/logout" });
  }

  /**
   * Get user
   * @type GET
   * @auth member
   * @returns User
   */
  async function RUser(_id: string) {
    return await database.R({
      location: `users/${_id}`,
    });
  }

  /**
   * Get user profile by _id
   * @type GET
   * @auth member
   * @returns User
   */
  async function RUserProfile(_id: string) {
    return await database.R({
      location: `users/${_id}/profile`,
    });
  }

  /**
   * Get user by userId or school
   * @type GET
   * @auth member
   * @returns LoggedIn User
   */
  async function RUsers(params?: {
    userId?: string | number;
    school?: string;
    schoolId?: string;
    "no-school"?: string;
    fields?: string[] | string;
    auth?: "owner" | "admin" | "manager" | "member";
  }) {
    if (params?.fields) params.fields = QUERY_SUB_BUILDER(params.fields);
    const { users: result } = await database.R({
      location: "users" + QUERY_BUILDER(params),
    });
    return result;
  }

  /**
   * Delete users
   * @type DELETE
   * @auth member
   * @returns Admin
   */
  async function DUsers(params: { _ids: string[] }) {
    const _users_string = QUERY_SUB_BUILDER(params._ids);
    return await database.D({
      location: "users" + QUERY_BUILDER({ _ids: _users_string }),
    });
  }

  /**
   * Season Api
   * ##########################################################################
   */

  /**
   * Create Season
   * @type POST
   * @auth admin manager
   * @returns Season
   */
  async function CSeason(props: {
    data: {
      school: string;
      year: string;
      term: string;
      period?: {
        start?: string;
        end?: string;
      };
      copyFrom?: string;
    };
  }) {
    const result = await database.C({ location: `seasons`, data: props.data });
    return result;
  }

  /**
   * Get Season by Id
   * @type GET
   * @auth member
   * @returns Season
   */
  async function RSeason(id: string) {
    const result = await database.R({ location: `seasons/${id}` });
    return result;
  }
  async function RSeasonWithRegistrations(id: string) {
    const result = await database.R({
      location: `seasons/${id}?withRegistrations=true`,
    });
    return result;
  }
  /**
   * Get Seasons
   * @type GET
   * @auth member
   * @returns Season
   */
  async function RSeasons(params: { school: string }) {
    const { seasons: result } = await database.R({
      location: `seasons` + QUERY_BUILDER(params),
    });
    return result;
  }

  /**
   * Update Season period
   * @type PUT
   * @auth admin manager
   * @returns Season
   */

  async function USeason(props: {
    _id: string;
    field: string;
    data: { start: string; end: string };
  }) {
    return await database.U({
      location: `seasons/${props._id}/${props.field}`,
      data: { new: props.data },
    });
  }

  /**
   * Activate Season
   * @type PUT
   * @auth admin manager
   * @returns Season
   */

  async function UActivateSeason(_id: string) {
    return await database.U({
      location: `seasons/${_id}/activate`,
      data: {},
    });
  }

  /**
   * Inactivate Season
   * @type PUT
   * @auth admin manager
   * @returns Season
   */

  async function UInactivateSeason(_id: string) {
    return await database.U({
      location: `seasons/${_id}/inactivate`,
      data: {},
    });
  }

  /**
   * Update Classrooms in season
   * @auth admin / manager
   * @returns Season
   */
  async function USeasonClassroom(props: { _id: string; data: string[] }) {
    return await database.U({
      location: `seasons/${props._id}/classrooms`,
      data: { new: props.data },
    });
  }

  /**
   * Update Subjects in season
   * @auth admin / manager
   * @returns Season
   */
  async function USeasonSubject(props: {
    _id: string;
    data: { label: string[]; data: any[] };
  }) {
    return await database.U({
      location: `seasons/${props._id}/subjects`,
      data: { new: props.data },
    });
  }

  /**
   * Update form in season
   * @auth admin / manager
   * @returns Season
   */
  async function USeasonForm(props: {
    _id: string;
    type: "timetable" | "syllabus" | "evaluation";
    data: any;
  }) {
    return await database.U({
      location: `seasons/${props._id}/form/${props.type}`,
      data: { new: props.data },
    });
  }

  /**
   * Update permission in season
   * @auth admin / manager
   * @returns Season
   */
  async function USeasonPermission(props: {
    _id: string;
    type: string | "syllabus" | "enrollment" | "evaluation";
    data: any;
  }) {
    return await database.U({
      location: `seasons/${props._id}/permission/${props.type}`,
      data: { new: props.data },
    });
  }

  /**
   * Delete Season
   * @type DELETE
   * @auth admin manager
   */

  async function DSeason(_id: string) {
    return await database.D({
      location: `seasons/${_id}`,
    });
  }
  /**
   * Registration Api
   * ##########################################################################
   */
  /**
   * Create Registrations
   * @type POST
   * @auth admin / managers
   * @returns Registrations
   */
  async function CRegistrations(props: {
    data: { season: string; users: any[]; info: any };
  }) {
    const { registrations: result } = await database.C({
      location: `registrations/bulk`,
      data: props.data,
    });
    return result;
  }

  /**
   * Create Registrations from other season
   * @type POST
   * @auth admin / managers
   * @returns Registrations
   */
  async function CRegistrationsCopy(props: {
    data: {
      fromSeason: string;
      toSeason: string;
    };
  }) {
    const { registrations: result } = await database.C({
      location: `registrations/copy`,
      data: props.data,
    });
    return result;
  }

  /**
   * Get Registration by param
   * @type GET
   * @auth member
   * @returns Registrations
   */
  async function RRegistrations(params?: {
    season?: string;
    school?: string;
    schoolId?: string;
    schoolName?: string;
    year?: string;
    term?: string;
    user?: string;
    userId?: string;
    userName?: string;
    role?: "student" | "teacher";
  }) {
    const { registrations: result } = await database.R({
      location: `registrations${QUERY_BUILDER(params)}`,
    });
    return result;
  }

  /**
   * Get Registration by _id
   * @type GET
   * @auth member
   * @returns Registration
   */
  async function RRegistration(_id: string) {
    return await database.R({
      location: `registrations/${_id}`,
    });
  }

  /**
   * Update Registration
   * @type PUT
   * @auth admin / manager
   * @returns
   */
  async function URegistrations(props: {
    _id?: string;
    _ids?: string[];
    data: {
      role?: string;
      grade?: string;
      group?: string;
      teacher?: string;
      teacherId?: string;
      teacherName?: string;
      subTeacher?: string;
      subTeacherId?: string;
      subTeacherName?: string;
    };
  }) {
    if (props._ids) {
      props._id = QUERY_SUB_BUILDER(props._ids);
    }
    return await database.U({
      location: `registrations/${props._id}`,
      data: props.data,
    });
  }
  /**
   * Delete Registratios
   * @type DELETE
   * @auth admin / manager
   * @returns
   */
  async function DRegistrations(params: { _ids: string[] }) {
    const _id = QUERY_SUB_BUILDER(params._ids);
    const result = await database.D({
      location: `registrations${QUERY_BUILDER({ _id })}`,
    });
    return result;
  }

  /**
   * Create Memo
   * @type POST
   * @auth member
   * @returns memos
   */
  async function CMemo(params: {
    rid: string;
    memo: {
      title: string;
      day: string;
      start: string;
      end: string;
      classroom?: string;
      memo?: string;
    };
  }) {
    const result = await database.C({
      location: "memos",
      data: { registration: params.rid, ...params.memo },
    });
    return result;
  }

  /**
   * Update Memo
   * @type PUT
   * @auth member
   * @returns memos
   */
  async function UMemo(params: {
    _id: string;
    rid: string;
    memo: {
      title: string;
      day: string;
      start: string;
      end: string;
      classroom?: string;
      memo?: string;
    };
  }) {
    const result = await database.U({
      location: "memos/" + params._id,
      data: { registration: params.rid, ...params.memo },
    });
    return result;
  }

  /**
   * Delete Memo
   * @type DELETE
   * @auth member
   * @returns memos
   */
  async function DMemo(params: { _id: string; rid: string }) {
    const result = await database.D({
      location:
        "memos/" + params._id + QUERY_BUILDER({ registration: params.rid }),
    });
    return result;
  }

  /**
   * Form Api
   * ##########################################################################
   */

  /**
   * Create Form
   * @type POST
   * @auth admin
   * @returns Created Form
   */
  async function CForm(data: {
    type: "syllabus" | "timetable" | "evaluation" | "archive";
    title: string;
    data: any[];
  }) {
    const result = await database.R({ location: "users/logout" });
    return result;
  }

  /**
   * Read Forms
   * @type GET
   * @auth admin
   * @returns Form list ([data]Field omitted)
   */
  async function RForms(params?: {
    userId?: string;
    userName?: string;
    type?: "syllabus" | "timetable" | "evaluation" | "archive";
    title?: string;
  }) {
    const { forms: result } = await database.R({
      location: "forms" + QUERY_BUILDER(params),
    });
    return result;
  }
  /**
   * Read Form by id
   * @type GET
   * @auth admin
   * @returns Form
   */
  async function RForm(id: string) {
    const result = await database.R({ location: "forms/" + id });
    return result;
  }
  /**
   * School Api
   * ##########################################################################
   */

  /**
   * Create School
   * @auth admin
   */
  async function CSchools(props: {
    data: { schoolId: string; schoolName: string };
  }) {
    return await database.C({ location: "schools", data: props.data });
  }
  /**
   * Read Schools
   * @auth admin
   */
  async function RSchools() {
    const { schools: result } = await database.R({ location: "schools" });
    return result;
  }

  /**
   * Read School by id
   * @auth member
   */
  async function RSchool(id: string) {
    return await database.R({ location: "schools/" + id });
  }

  /**
   * Read School by id with seasons
   * @auth member
   */
  async function RSchoolWithSeasons(id: string) {
    return await database.R({
      location: "schools/" + id + "?includes=seasons",
    });
  }

  /**
   * Update Classrooms in school
   * @auth admin
   */
  async function USchoolClassroom(props: {
    academyId?: string;
    schoolId: string;
    data: any;
  }) {
    return await database.U({
      location: `${
        props.academyId ? `academies/${props.academyId}/` : ""
      }schools/${props.schoolId}/classrooms`,
      data: { new: props.data },
    });
  }

  /**
   * Update Subjects in school
   * @auth admin
   */
  async function USchoolSubject(props: {
    academyId?: string;
    schoolId: string;
    data: any;
  }) {
    return await database.U({
      location: `${
        props.academyId ? `academies/${props.academyId}/` : ""
      }schools/${props.schoolId}/subjects`,
      data: { new: props.data },
    });
  }

  /**
   * Update form in season
   * @auth admin / manager
   */
  async function USchoolForm(props: {
    _id: string;
    type: "timetable" | "syllabus" | "evaluation";
    data: any;
  }) {
    return await database.U({
      location: `schools/${props._id}/form/${props.type}`,
      data: { new: props.data },
    });
  }

  /**
   * Update permission in season
   * @auth admin / manager
   */
  async function USchoolPermission(props: {
    _id: string;
    type: string | "syllabus" | "enrollment" | "evaluatoin";
    data: any;
  }) {
    return await database.U({
      location: `schools/${props._id}/permission/${props.type}`,
      data: { new: props.data },
    });
  }

  /**
   * Update formArchive in school
   * @auth admin
   */
  async function USchoolFormArchive(props: { schoolId: string; data: any }) {
    return await database.U({
      location: `schools/${props.schoolId}/form/archive`,
      data: { new: props.data },
    });
  }
  /**
   * Enrollment Api
   * ##########################################################################
   */

  /**
   * Create Enrollment
   * @type POST
   * @auth member
   */
  async function CEnrollment(props: {
    data: { syllabus: string; registration: string };
  }) {
    return await database.C({
      location: "enrollments",
      data: props.data,
    });
  }

  /**
   * Create Enrollments (bulk)
   * @type POST
   * @auth member(teacher)
   */
  async function CEnrollments(props: {
    data: {
      registration: string;
      syllabus: string;
      students: any[];
    };
  }) {
    const { enrollments: res } = await database.C({
      location: "enrollments/bulk",
      data: props.data,
    });
    return res;
  }

  /**
   * Read Enrollments and Sort By 'CreatedAt'
   * @type GET
   * @auth member
   * @returns Enrollments
   */
  async function REnrolllments(params: {
    syllabus?: string;
    season?: string;
    studentId?: string | number; //deprecated
    student?: string | number;
    syllabuses?: string[] | string;
  }) {
    if (params.syllabuses)
      params.syllabuses = QUERY_SUB_BUILDER(params?.syllabuses);

    const { enrollments } = await database.R({
      location: "enrollments" + QUERY_BUILDER(params),
    });

    // return enrollments;
    return _.sortBy(enrollments, "createdAt");
  }

  /**
   * Read Enrollment
   * @type GET
   * @auth member
   * @returns Enrollment
   */
  async function REnrolllment(id?: string) {
    const result = await database.R({
      location: "enrollments/" + id,
    });
    return result;
  }

  /**
   * Update Enrollment memo
   * @type Post
   * @auth member
   */
  async function UEnrollmentMemo(props: { _id?: string; memo: string }) {
    const result = await database.U({
      location: "enrollments/" + props._id + "/memo",
      data: { memo: props.memo },
    });
    return result;
  }

  /**
   * Delete Enrollment
   * @type DELETE
   * @auth member
   * @returns Enrollment
   */
  async function DEnrollment(id?: string) {
    const result = await database.D({
      location: "enrollments/" + id,
    });
    return result;
  }

  /**
   * Delete Enrollments
   * @type DELETE
   * @auth member
   * @returns Enrollment
   */
  async function DEnrollments(_ids: any[]) {
    const _enrollments_ids = QUERY_SUB_BUILDER(_ids);
    return await database.D({
      location: "enrollments" + QUERY_BUILDER({ _ids: _enrollments_ids }),
    });
  }

  /**
   * Read Enrollment with Evaluations and Sort By 'createdAt'
   * @type GET
   * @auth member
   * @returns Enrollments
   */
  async function REnrollmentWithEvaluations(params: {
    syllabus?: string;
    student?: string;
    school?: string;
  }) {
    const { enrollments } = await database.R({
      location: "enrollments/evaluations" + QUERY_BUILDER(params),
    });
    // return enrollments;
    return _.sortBy(enrollments, "createdAt");
  }

  /**
   * Update Evaluation
   * @type GET
   * @auth member
   * @returns Enrollments
   */
  async function UEvaluation(props: {
    enrollment?: string;
    by: "mentor" | "student";
    data: any;
  }) {
    return await database.U({
      location: `enrollments/${props.enrollment}/evaluation2?by=${props.by}`,
      data: { new: props.data },
    });
  }

  /**
   * Archive Api
   * ##########################################################################
   */
  /**
   * Read Archive
   * @type GET
   * @auth admin
   * @returns Archives
   */
  async function RArchives(params: {
    school?: string;
    user?: string | number;
    registration?: string | number;
  }) {
    const result = await database.R({
      location: "archives" + QUERY_BUILDER(params),
    });
    return result;
  }
  /**
   * Update Archive
   * @type PUT
   * @auth admin
   * @returns Archive
   */
  async function UArchive(params: { _id: string; data: object }) {
    const result = await database.U({
      location: `archives/${params._id}`,
      data: params.data,
    });
    return result;
  }

  /**
   * Syllabus Api
   * ##########################################################################
   */
  /**
   * Create Syllabus
   * @auth member
   */
  async function CSyllabus(props: {
    data: {
      season: string;
      registration: string;
      classTitle: string;
      point: number;
      subject: string[];
      teachers: any[];
      classroom: string;
      time: any[];
      info: any;
      limit: number;
    };
  }) {
    return await database.C({
      location: `syllabuses`,
      data: props.data,
    });
  }
  /**
   * Get Syllabuses and enrollments
   * @type GET
   * @auth member
   * @returns list of syllabuses
   */
  async function RSyllabuses(props: {
    season?: string;
    classroom?: string;
    matches?: string;
    field?: string;
    confirmed?: boolean;
    user?: string;
    teacher?: string;
  }) {
    return await database.R({
      location: "syllabuses" + QUERY_BUILDER(props),
    });
  }
  /**
   * Get Syllabus
   * @type GET
   * @auth member
   * @returns syllabus
   */
  async function RSyllabus(_id?: string) {
    return await database.R({
      location: `syllabuses/${_id}`,
    });
  }
  /**
   * Update Syllabus
   * @type PUT
   * @auth member
   */
  async function USyllabus(props: {
    _id: string;
    data: {
      classTitle: string;
      point: number;
      subject: string[];
      teachers: any[];
      classroom: string;
      time: any[];
      info: any;
      limit: number;
    };
  }) {
    return await database.U({
      location: `syllabuses/${props._id}`,
      data: { new: props.data },
    });
  }
  /**
   * Confirm Syllabus
   * @type PUT
   * @auth member
   */
  async function ConfirmSyllabus(_id: string) {
    return await database.U({
      location: `syllabuses/${_id}/confirmed`,
      data: {},
    });
  }
  /**
   * Unconfirm Syllabus
   * @type DELETE
   * @auth member
   */
  async function UnconfirmSyllabus(_id: string) {
    return await database.D({
      location: `syllabuses/${_id}/confirmed`,
    });
  }
  /**
   * Delete Syllabus
   * @type Delete
   * @auth member
   */
  async function DSyllabus(_id: string) {
    return await database.D({
      location: `syllabuses/${_id}`,
    });
  }
  /**
   * Read CourseList(enrolled,created,mentoring)
   * @type GET
   * @auth member
   * @returns syllabuses
   */
  async function RCourses(props: { season: string; user: string }) {
    const { courses } = await database.R({
      location: "courses" + QUERY_BUILDER(props),
    });
    return courses;
  }

  /**
   * Notification Api
   * ##########################################################################
   */
  async function SendNotifications(props: {
    data: {
      toUserList: any[];
      category: string;
      title: string;
      description: string;
    };
  }) {
    return await database.C({
      location: `notifications`,
      data: props.data,
    });
  }

  async function RNotifications(props: {
    type: "received" | "sent";
    user: string;
    checked?: boolean;
  }) {
    const { notifications } = await database.R({
      location: "notifications" + QUERY_BUILDER(props),
    });
    return notifications;
  }
  async function RNotificationById(_id: string) {
    return await database.R({
      location: `notifications/${_id}`,
    });
  }
  async function UCheckNotification(_id: string) {
    const res = await database.U({
      location: `notifications/${_id}/check`,
      data: {},
    });
    return res;
  }

  async function DNotifications(_ids: string[]) {
    const _notifications_ids = QUERY_SUB_BUILDER(_ids);
    return await database.D({
      location: "notifications" + QUERY_BUILDER({ _ids: _notifications_ids }),
    });
  }

  return {
    AcademyApi: {
      CAcademy,
      RAcademies,
      RAcademy,
      UAcademy,
      UActivateAcademy,
      UInactivateAcademy,
      CAcademyDocument,
      USchoolSubject,
    },
    UserApi: {
      CLoginLocal,
      RMySelf,
      RLogout,
      CGoogleLocal,
      CConnectGoogle,
      RUsers,
      RUser,
      RUserProfile,
      DUsers,
    },
    SeasonApi: {
      CSeason,
      RSeason,
      RSeasonWithRegistrations,
      RSeasons,
      USeason,
      UActivateSeason,
      UInactivateSeason,
      USeasonSubject,
      USeasonClassroom,
      USeasonForm,
      USeasonPermission,
      DSeason,
    },
    SchoolApi: {
      CSchools,
      RSchools,
      RSchool,
      RSchoolWithSeasons,
      USchoolClassroom,
      USchoolSubject,
      USchoolForm,
      USchoolPermission,
      USchoolFormArchive,
    },
    RegistrationApi: {
      CRegistrations,
      CRegistrationsCopy,
      RRegistrations,
      RRegistration,
      URegistrations,
      DRegistrations,
      CMemo,
      UMemo,
      DMemo,
    },
    EnrollmentApi: {
      CEnrollment,
      CEnrollments,
      REnrolllment,
      REnrolllments,
      DEnrollment,
      DEnrollments,
      REnrollmentWithEvaluations,
      UEvaluation,
      UEnrollmentMemo,
    },
    FormApi: {
      CForm,
      RForms,
      RForm,
    },
    ArchiveApi: {
      RArchives,
      UArchive,
    },
    SyllabusApi: {
      CSyllabus,
      RSyllabus,
      RSyllabuses,
      USyllabus,
      DSyllabus,
      RCourses,
      ConfirmSyllabus,
      UnconfirmSyllabus,
    },
    NotificationApi: {
      SendNotifications,
      RNotifications,
      RNotificationById,
      UCheckNotification,
      DNotifications,
    },
  };
}
