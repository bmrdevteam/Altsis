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
export default function useApi() {
  const database = useDatabase();

  /**
   * Academy Api
   * ##########################################################################
   */

  /**
   * Get Academies
   * @type GET
   * @auth guest
   * @returns list of academies
   */
  async function CAcademies() {
    const { academies: result } = await database.R({ location: "academies" });
    return result;
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
  async function CGoogleLocal(data: { credential: string }) {
    return await database.C({ location: "users/google", data: data });
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
    const result = await database.R({ location: "users/current" });
    return result;
  }

  /**
   * Logout user
   * @type GET
   * @auth member
   * @returns Logout user
   */
  async function RLogout() {
    const result = await database.R({ location: "users/logout" });
    return result;
  }
  /**
   * Season Api
   * ##########################################################################
   */

  /**
   * Get Season by Id
   * @type GET
   * @auth member
   * @returns Season
   */
  async function RGetSeasonById(id: string) {
    const result = await database.R({ location: `seasons/${id}` });
    return result;
  }

  /**
   * Registration Api
   * ##########################################################################
   */

  /**
   * Form Api
   * ##########################################################################
   */

  /**
   * School Api
   * ##########################################################################
   */

  /**
   * Create School
   * @auth admin
   */
  async function CSchools(data: { schoolId: string; schoolName: string }) {
    return await database.C({ location: "schools", data: data });
  }
  /**
   * Read Schools
   * @auth admin
   */
  async function RSchools() {
    return await database.R({ location: "schools" });
  }
  /**
   * Read Schools by id
   * @auth admin
   */
  async function RSchoolsById(id: string) {
    return await database.R({ location: "schools" });
  }
  /**
   * Update Classrooms in school
   * @auth admin
   */
  async function USchoolClassroom(props: {
    academyId: string;
    schoolId: string;
    data: any;
  }) {
    return await database.U({
      location: `academies/${props.academyId}/schools/${props.schoolId}/classrooms`,
      data: { new: props.data },
    });
  }
  /**
   * Update Subjects in school
   * @auth admin
   */
  async function USchoolSubject(props: {
    academyId: string;
    schoolId: string;
    data: any;
  }) {
    return await database.U({
      location: `academies/${props.academyId}/schools/${props.schoolId}/subjects`,
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
      CAcademies,
    },
    UserApi: {
      CLoginLocal,
      RMySelf,
    },
    SeasonApi: { RGetSeasonById },
    SchoolApi: {
      CSchools,
      RSchools,
      RSchoolsById,
      USchoolClassroom,
      USchoolSubject,
    },
    NotificationApi: { CUpdatedNotifications, UCheckNotification },
  };
}
