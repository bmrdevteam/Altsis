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
   * Get user by userId or school
   * @type GET
   * @auth member
   * @returns LoggedIn User
   */
  async function RUsers(params?: {
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
    data: { season: string; users: any[] };
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
   * Update Registration
   * @type PUT
   * @auth admin / manager
   * @returns
   */
  async function URegistrations(props: {
    _id?: string;
    _ids?: string[];
    data: {
      role: string;
      grade: string;
      group: string;
      teacherId: string;
      teacherName: string;
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
   * Read Enrollments
   * @type GET
   * @auth member
   * @returns Enrollments
   */
  async function REnrolllments(params: {
    syllabus?: string;
    season?: string;
    studentId?: string | number;
    syllabuses?: string[] | string;
  }) {
    if (params.syllabuses)
      params.syllabuses = QUERY_SUB_BUILDER(params?.syllabuses);

    const { enrollments } = await database.R({
      location: "enrollments" + QUERY_BUILDER(params),
    });
    return enrollments;
  }

  /**
   * Read Enrollment
   * @type GET
   * @auth member
   * @returns Enrollment
   */
  async function REnrolllment(id: string) {
    const result = await database.R({
      location: "enrollments" + id,
    });
    return result;
  }

  /**
   * Archive Api
   * ##########################################################################
   */
  /**
   * Read Archives
   * @type GET
   * @auth admin
   * @returns Archives
   */
  async function RArchives(params: {
    school?: string;
    userId?: string | number;
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
      classTitle: string;
      point: string;
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
   * Get Syllabuses
   * @type GET
   * @auth member
   * @returns list of syllabuses
   */
  async function RSyllabuses(props: { season?: string; classroom?: string }) {
    const { syllabuses: result } = await database.R({
      location: "syllabuses" + QUERY_BUILDER(props),
    });
    return result;
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
      point: string;
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
   * Notification Api
   * ##########################################################################
   */
  async function CUpdatedNotifications(userId: string) {
    const { notifications } = await database.R({
      location: `notifications?type=received&userId=${userId}&checked=false&updated=true`,
    });
    return notifications;
  }
  async function UCheckNotification(_id: string) {
    const res = await database.U({
      location: `notifications/${_id}/check`,
      data: {},
    });
    return res;
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
      DUsers,
    },
    SeasonApi: {
      CSeason,
      RSeason,
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
      URegistrations,
      DRegistrations,
    },
    EnrollmentApi: { REnrolllment, REnrolllments },
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
    },
    NotificationApi: { CUpdatedNotifications, UCheckNotification },
  };
}
