/**
 * @file uesAPIv2 hook
 *
 *
 * @author <jessie129j@gmail.com>
 *
 */

import useDatabase from "hooks/useDatabase";

import { MESSAGE } from "./_message";
import { TAcademy } from "types/academies";
import { TUser } from "types/users";
import _ from "lodash";
import { TCurrentUser } from "types/auth";
import { TSchool, TSchoolFormArchive } from "types/schools";
import {
  TFormEvaluation,
  TSeason,
  TSeasonWithRegistrations,
} from "types/seasons";
import { TRegistration } from "types/registrations";
import { TSyllabus } from "types/syllabuses";
import { TEnrollment } from "types/enrollments";
import { TNotification } from "types/notification";

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

export const ALERT_ERROR = (err: any) => {
  let message = "";
  if (err.response?.data?.message) {
    message += MESSAGE.get(err.response.data.message) ?? "";
    if (message === "") {
      message += MESSAGE.get("UNKNOWN");
      message += `\n\nstatus: ${err.response.status}`;
      message += `\nmessage: ${err.response.data.message}`;
    }
  } else {
    message += MESSAGE.get("UNKNOWN");
  }
  alert(message);
};

export default function useAPIv2() {
  const database = useDatabase();

  /**
   * API FUNCTIONS
   */

  /**
   * ##########################################################################
   * Academy API
   * ##########################################################################
   */

  /**
   * CAcademy API
   * @description 아카데미 생성 API
   * @version 2.0.0
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
    const { academy, admin } = await database.C({
      location: `academies`,
      data: props.data,
    });
    return {
      academy: academy as TAcademy,
      admin: admin as TUser & {
        auth: "admin";
        password: string;
      },
    };
  }

  /**
   * RAcademy API
   * @description 아카데미 조회 API
   * @version 2.0.0
   * @auth owner|guest
   */
  async function RAcademy(props: {
    query: {
      academyId: string;
    };
  }) {
    const { academy } = await database.R({
      location: `academies` + QUERY_BUILDER(props.query),
    });
    return {
      academy: academy as TAcademy,
    };
  }

  /**
   * RAcademies API
   * @description 아카데미 목록 조회 API
   * @version 2.0.0
   * @auth owner
   */

  async function RAcademies() {
    const { academies } = await database.R({
      location: `academies`,
    });
    return {
      academies: academies as TAcademy[],
    };
  }

  /**
   * UAcademyEmail API
   * @description 아카데미 이메일 변경 API
   * @version 2.0.0
   * @auth owner
   */

  async function UAcademyEmail(props: {
    params: {
      academyId: string;
    };
    data: {
      email?: string;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/email`,
      data: props.data,
    });
    return {
      academy: academy as TAcademy,
    };
  }

  /**
   * UAcademyTel API
   * @description 아카데미 전화번호 변경 API
   * @version 2.0.0
   * @auth owner
   */
  async function UAcademyTel(props: {
    params: {
      academyId: string;
    };
    data: {
      tel?: string;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/tel`,
      data: props.data,
    });
    return {
      academy: academy as TAcademy,
    };
  }

  /**
   * UActivateAcademy API
   * @description 아카데미 활성화 API
   * @version 2.0.0
   * @auth owner
   */
  async function UActivateAcademy(props: {
    params: {
      academyId: string;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/activate`,
      data: {},
    });
    return {
      academy: academy as TAcademy,
    };
  }

  /**
   * UInactivateAcademy API
   * @description아카데미 비활성화 API
   * @version 2.0.0
   * @auth owner
   */
  async function UInactivateAcademy(props: {
    params: {
      academyId: string;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/inactivate`,
      data: {},
    });
    return {
      academy: academy as TAcademy,
    };
  }

  /**
   * CAcademyBackup API
   * @description 아카데미 백업 생성 API
   * @version 2.0.0
   * @auth owner
   */
  async function CAcademyBackup(props: {
    params: { academyId: string };
    data: { models: { title: string }[] };
  }) {
    const { logs } = await database.C({
      location: `academies/${props.params.academyId}/backup`,
      data: props.data,
    });
    return { logs: logs as string[] };
  }

  /**
   * URestoreAcademy API
   * @description 아카데미 복구 API
   * @version 2.0.0
   * @auth owner
   */
  async function URestoreAcademy(props: {
    params: { academyId: string };
    data: { model: string; documents: any[] };
  }) {
    return await database.U({
      location: `academies/${props.params.academyId}/restore`,
      data: props.data,
    });
  }

  /**
   * RAcademyBackupList API
   * @description 아카데미 백업 목록 조회 API
   * @version 2.0.0
   * @auth owner
   */
  async function RAcademyBackupList(props: {
    params: {
      academyId: string;
    };
  }) {
    const { backupList } = await database.R({
      location: `academies/${props.params.academyId}/backup`,
    });
    return {
      backupList: _.sortBy(backupList, "title").reverse() as {
        title: string;
        key: string;
      }[],
    };
  }

  /**
   * RAcademyBackup API
   * @description 아카데미 백업 조회 API
   * @version 2.0.0
   * @auth owner
   */
  async function RAcademyBackup(props: {
    params: {
      academyId: string;
    };
    query: {
      title: string;
    };
  }) {
    const { backup } = await database.R({
      location:
        `academies/${props.params.academyId}/backup` +
        QUERY_BUILDER(props.query),
    });
    return {
      backup: backup as {
        title: string;
        key: string;
        size: number;
        lastModified: string;
      }[],
    };
  }

  /**
   * DAcademyBackup API
   * @description 아카데미 백업 삭제 API
   * @version 2.0.0
   * @auth owner
   */
  async function DAcademyBackup(props: {
    params: {
      academyId: string;
    };
    query: {
      title: string;
    };
  }) {
    return await database.D({
      location:
        `academies/${props.params.academyId}/backup` +
        QUERY_BUILDER(props.query),
    });
  }

  /**
   * RAcademyDocuments API
   * @description 아카데미 데이터 목록 조회 API
   * @version 2.0.0
   * @auth owner
   */
  async function RAcademyDocuments(props: {
    params: {
      academyId: string;
      docType: "schools" | "registrations" | "seasons";
    };
    query?: object;
  }) {
    const { documents } = await database.R({
      location:
        `academies/${props.params.academyId}/${props.params.docType}` +
        (props.query ? QUERY_BUILDER(props.query) : ""),
    });
    return {
      documents,
    };
  }

  /**
   * RAcademyDocument API
   * @description 아카데미 데이터 조회 API
   * @version 2.0.0
   * @auth owner
   */
  async function RAcademyDocument(props: {
    params: {
      academyId: string;
      docType: "schools" | "registrations" | "seasons";
      docId: string;
    };
  }) {
    const { document } = await database.R({
      location: `academies/${props.params.academyId}/${props.params.docType}/${props.params.docId}`,
    });
    return {
      document,
    };
  }

  /**
   * DAcademy API
   * @description 아카데미 삭제 API
   * @version 2.0.0
   * @auth owner
   */
  async function DAcademy(props: {
    params: {
      academyId: string;
    };
  }) {
    await database.D({
      location: `academies/${props.params.academyId}`,
    });
    return {};
  }

  /**
   * ##########################################################################
   * User API
   * ##########################################################################
   */

  /**
   * LoginLocal API
   * @description 로컬 로그인 API
   * @version 2.0.0
   * @auth guest
   */
  async function LoginLocal(props: {
    data: {
      academyId: string;
      userId: string;
      password: string;
      persist?: boolean;
    };
  }) {
    return await database.C({
      location: "users/login/local",
      data: props.data,
    });
  }

  /**
   * LoginGoogle API
   * @description 구글 로그인 API
   * @version 2.0.0
   * @auth guest
   */
  async function LoginGoogle(props: {
    data: {
      academyId: string;
      credential: string;
      persist?: boolean;
    };
  }) {
    return await database.C({
      location: "users/login/google",
      data: props.data,
    });
  }

  /**
   * Logout API
   * @description 로그아웃 API
   * @version 2.0.0
   * @auth user
   */
  async function Logout() {
    return await database.R({
      location: "users/logout",
    });
  }

  /**
   * CGoogleAuth API
   * @description 구글 로그인 활성화 API
   * @version 2.0.0
   * @auth admin
   */
  async function CGoogleAuth(props: {
    params: {
      uid: string;
    };
    data: {
      email: string;
    };
  }) {
    const { snsId } = await database.U({
      location: `users/${props.params.uid}/google`,
      data: props.data,
    });

    return { snsId: snsId as { google?: string } };
  }

  /**
   * DGoogleAuth API
   * @description 구글 로그인 비활성화 API
   * @version 2.0.0
   * @auth admin
   */
  async function DGoogleAuth(props: {
    params: {
      uid: string;
    };
  }) {
    const { snsId } = await database.D({
      location: `users/${props.params.uid}/google`,
    });

    return { snsId: snsId as { google?: string } };
  }

  /**
   * UUserAuth API
   * @description 등급 변경 API
   * @version 2.0.0
   * @auth admin
   */
  async function UUserAuth(props: {
    params: {
      uid: string;
    };
    data: {
      auth: "manager" | "member";
    };
  }) {
    const { auth } = await database.U({
      location: `users/${props.params.uid}/auth`,
      data: props.data,
    });

    return { auth: auth as "member" | "manager" };
  }

  /**
   * UUserEmail API
   * @description 이메일 변경 API
   * @version 2.0.0
   * @auth admin|user
   */
  async function UUserEmail(props: {
    params: {
      uid: string;
    };
    data: {
      email?: string;
    };
  }) {
    const { email } = await database.U({
      location: `users/${props.params.uid}/email`,
      data: props.data,
    });

    return { email: email as string | undefined };
  }

  /**
   * UUserTel API
   * @description 전화번호 변경 API
   * @version 2.0.0
   * @auth admin|user
   */
  async function UUserTel(props: {
    params: {
      uid: string;
    };
    data: {
      tel?: string;
    };
  }) {
    const { tel } = await database.U({
      location: `users/${props.params.uid}/tel`,
      data: props.data,
    });

    return { tel: tel as string | undefined };
  }

  /**
   * UUserProfile API
   * @description 프로필 사진 변경 API
   * @version 2.0.0
   * @auth user
   */
  async function UUserProfile(props: { data: FormData }) {
    const { profile } = await database.U({
      location: `users/profile`,
      data: props.data,
    });

    return { profile: profile as string | undefined };
  }

  /**
   * UUserCalendar API
   * @description 캘린더 변경 API
   * @version 2.0.0
   * @auth user
   */
  async function UUserCalendar(props: {
    data: {
      calendar?: string;
    };
  }) {
    const { calendar } = await database.U({
      location: `users/calendar`,
      data: props.data,
    });

    return { calendar: calendar as string | undefined };
  }

  /**
   * UUserPassword API
   * @description 비밀번호 변경 API
   * @version 2.0.0
   * @auth admin|user
   */
  async function UUserPassword(props: {
    params: {
      uid: string;
    };
    data: {
      password: string;
    };
  }) {
    return await database.U({
      location: `users/${props.params.uid}/password`,
      data: props.data,
    });
  }

  /**
   * CUserSchool API
   * @description 소속 학교 추가 API
   * @version 2.0.0
   * @auth admin
   */
  async function CUserSchool(props: {
    params: {
      uid: string;
    };
    data: {
      sid: string;
    };
  }) {
    const { schools } = await database.C({
      location: `users/${props.params.uid}/schools`,
      data: props.data,
    });
    return {
      schools: schools as {
        school: string;
        schoolId: string;
        schoolName: string;
      }[],
    };
  }

  /**
   * DUserSchool API
   * @description 소속 학교 삭제 API
   * @version 2.0.0
   * @auth admin
   */
  async function DUserSchool(props: {
    params: {
      uid: string;
    };
    query: {
      sid: string;
    };
  }) {
    const { schools } = await database.D({
      location:
        `users/${props.params.uid}/schools` + QUERY_BUILDER(props.query),
    });
    return {
      schools: schools as {
        school: string;
        schoolId: string;
        schoolName: string;
      }[],
    };
  }

  /**
   * CUser API
   * @description 사용자 생성 API
   * @version 2.0.0
   * @auth admin
   */
  async function CUser(props: {
    data: {
      schools: { school: string }[];
      auth: "member" | "manager";
      userId: string;
      userName: string;
      password: string;
      tel?: string;
      email?: string;
      snsId?: {
        google?: string;
      };
    };
  }) {
    const { user } = await database.C({
      location: `users`,
      data: props.data,
    });
    return {
      user,
    };
  }

  /**
   * RUsers API
   * @description 사용자 목록 조회 API
   * @version 2.0.0
   * @auth owner|admin|manager
   */
  async function RUsers(props: {
    query?: {
      sid?: string; // school objectId
      academyId?: string; // if user is owner
    };
  }) {
    const { users } = await database.R({
      location: `users` + QUERY_BUILDER(props.query),
    });
    return {
      users: _.orderBy(users, ["userName", "userId"], ["asc", "asc"]),
    };
  }

  /**
   * RUser API
   * @description 사용자 조회 API
   * @version 2.0.0
   * @auth owner|admin|manager
   */
  async function RUser(props: {
    params: {
      _id: string; // user objectId
    };
    query?: {
      academyId?: string; // required for owner
    };
  }) {
    const { user } = await database.R({
      location: `users/${props.params._id}` + QUERY_BUILDER(props.query),
    });
    return {
      user,
    };
  }

  /**
   * DUser API
   * @description 사용자 삭제 API
   * @version 2.0.0
   * @auth admin
   */
  async function DUser(props: {
    params: {
      _id: string; // user objectId
    };
  }) {
    return await database.D({
      location: `users/${props.params._id}`,
    });
  }

  /**
   * RMySelf API
   * @description 본인 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RMySelf() {
    const { user, registrations } = await database.R({
      location: `users/current`,
    });

    user.registrations = _.orderBy(
      registrations,
      [(reg) => reg?.period?.end ?? ""],
      ["desc"]
    );

    return { user: user as TCurrentUser };
  }

  /**
   * RUserProfile API
   * @description 사용자 프로필사진 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RUserProfile(props: { params: { _id: string } }) {
    const { profile } = await database.R({
      location: `users/${props.params._id}/profile`,
    });
    return { profile: profile as string | undefined };
  }

  /**
   * ##########################################################################
   * School API
   * ##########################################################################
   */

  /**
   * CSchool API
   * @description 학교 생성 API
   * @version 2.0.0
   * @auth admin
   */
  async function CSchool(props: {
    data: {
      schoolId: string;
      schoolName: string;
    };
  }) {
    const { school } = await database.C({
      location: "schools",
      data: props.data,
    });
    return {
      school: school as {
        _id: string;
        schoolId: string;
        schoolName: string;
      },
    };
  }

  /**
   * RSchools API
   * @description 학교 목록 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RSchools() {
    const { schools } = await database.R({
      location: "schools",
    });
    return {
      schools: schools as TSchool[],
    };
  }

  /**
   * RSchool API
   * @description 학교 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RSchool(props: {
    params: {
      _id: string;
    };
  }) {
    const { school } = await database.R({
      location: `schools/${props.params._id}`,
    });
    return {
      school: school as TSchool,
    };
  }

  /**
   * USchoolFormArchive API
   * @description 학교 기록 양식 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USchoolFormArchive(props: {
    params: {
      _id: string;
    };
    data: {
      formArchive: TSchoolFormArchive;
    };
  }) {
    const { formArchive } = await database.U({
      location: `schools/${props.params._id}/formArchive`,
      data: props.data,
    });
    return {
      formArchive: formArchive as TSchoolFormArchive,
    };
  }

  /**
   * USchoolFormArchive API
   * @description 학교 링크 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USchoolLinks(props: {
    params: {
      _id: string;
    };
    data: {
      links: { title: string; url: string }[];
    };
  }) {
    const { links } = await database.U({
      location: `schools/${props.params._id}/links`,
      data: props.data,
    });
    return {
      links: links as { title: string; url: string }[],
    };
  }

  /**
   * USchoolCalendars API
   * @description 학교 캘린더 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USchoolCalendars(props: {
    params: {
      _id: string;
    };
    data: {
      calendar?: string;
      calendarTimetable?: string;
    };
  }) {
    const { calendar, calendarTimetable } = await database.U({
      location: `schools/${props.params._id}/calendars`,
      data: props.data,
    });
    return {
      calendar: calendar as string | undefined,
      calendarTimetable: calendarTimetable as string | undefined,
    };
  }

  /**
   * DSchool API
   * @description 학교 삭제 API
   * @version 2.0.0
   * @auth admin
   */
  async function DSchool(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.D({
      location: "schools/" + props.params._id,
    });
  }

  /**
   * ##########################################################################
   * Season API
   * ##########################################################################
   */

  /**
   * CSeason API
   * @description 학기 생성 API
   * @version 2.0.0
   * @auth admin|manager
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
    const { season } = await database.C({
      location: `seasons`,
      data: props.data,
    });
    return { season: season as TSeason };
  }

  /**
   * RSeasons API
   * @description 학기 목록 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RSeasons(props: {
    query: {
      school?: string;
    };
  }) {
    const { seasons } = await database.R({
      location: `seasons` + QUERY_BUILDER(props.query),
    });
    return {
      seasons: _.orderBy(
        seasons,
        [
          (season) => new Date(season.period?.start ?? "").getTime(),
          (season) => new Date(season.period?.end ?? "").getTime(),
          "createdAt",
        ],
        ["desc", "desc", "desc"]
      ) as TSeason[],
    };
  }

  /**
   * RSeason API
   * @description 학기 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RSeason(props: {
    params: {
      _id: string;
    };
  }) {
    const { season, registrations } = await database.R({
      location: `seasons/${props.params._id}`,
    });
    season.registrations = _.orderBy(
      registrations,
      [
        (reg) => (reg.role && reg.role !== "" ? reg.role : "_"),
        (reg) => (reg.grade && reg.grade !== "" ? reg.grade : "_"),
        "userName",
        "userId",
      ],
      ["asc", "asc", "asc", "asc"]
    );

    return { season: season as TSeasonWithRegistrations };
  }

  /**
   * UActivateSeason API
   * @description 학기 활성화 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function UActivateSeason(props: {
    params: {
      _id: string;
    };
  }) {
    const { season } = await database.U({
      location: `seasons/${props.params._id}/activate`,
      data: {},
    });

    return { season: season as TSeason };
  }

  /**
   * UInactivateSeason API
   * @description 학기 비활성화 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function UInactivateSeason(props: {
    params: {
      _id: string;
    };
  }) {
    const { season } = await database.U({
      location: `seasons/${props.params._id}/inactivate`,
      data: {},
    });

    return { season: season as TSeason };
  }

  /**
   * USeasonClassrooms API
   * @description 학기 강의실 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USeasonClassrooms(props: {
    params: {
      _id: string;
    };
    data: {
      classrooms: string[];
    };
  }) {
    return await database.U({
      location: `seasons/${props.params._id}/classrooms`,
      data: props.data,
    });
  }

  /**
   * USeasonSubjects API
   * @description 학기 교과목 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USeasonSubjects(props: {
    params: {
      _id: string;
    };
    data: {
      label: string[];
      data: string[][];
    };
  }) {
    return await database.U({
      location: `seasons/${props.params._id}/subjects`,
      data: props.data,
    });
  }

  /**
   * USeasonPeriod API
   * @description 학기 기간 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USeasonPeriod(props: {
    params: {
      _id: string;
    };
    data: {
      start?: string;
      end?: string;
    };
  }) {
    const { season } = await database.U({
      location: `seasons/${props.params._id}/period`,
      data: props.data,
    });
    return { season: season as TSeason };
  }

  /**
   * USeasonPermission API
   * @description 학기 권한 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USeasonPermission(props: {
    params: {
      _id: string;
      type: "syllabus" | "enrollment" | "evaluation";
    };
    data: {
      teacher?: boolean;
      student?: boolean;
    };
  }) {
    return await database.U({
      location: `seasons/${props.params._id}/permission/${props.params.type}`,
      data: props.data,
    });
  }

  /**
   * CSeasonPermissionException API
   * @description 학기 권한 예외 추가 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CSeasonPermissionException(props: {
    params: {
      _id: string;
      type: "syllabus" | "enrollment" | "evaluation";
    };
    data: {
      registration: string;
      isAllowed: boolean;
    };
  }) {
    return await database.C({
      location: `seasons/${props.params._id}/permission/${props.params.type}/exceptions`,
      data: props.data,
    });
  }

  /**
   * DSeasonPermissionException API
   * @description 학기 권한 예외 삭제 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function DSeasonPermissionException(props: {
    params: {
      _id: string;
      type: "syllabus" | "enrollment" | "evaluation";
    };
    query: {
      registration: string;
    };
  }) {
    return await database.D({
      location:
        `seasons/${props.params._id}/permission/${props.params.type}/exceptions` +
        QUERY_BUILDER(props.query),
    });
  }

  /**
   * USeasonFormTimetable API
   * @description 학기 시간표 양식 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USeasonFormTimetable(props: {
    params: {
      _id: string;
    };
    data: {
      form: string;
    };
  }) {
    const { season } = await database.U({
      location: `seasons/${props.params._id}/form/timetable`,
      data: props.data,
    });
    return { season: season as TSeason };
  }

  /**
   * USeasonFormTimetable API
   * @description 학기 강의계획서 양식 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USeasonFormSyllabus(props: {
    params: {
      _id: string;
    };
    data: {
      form: string;
    };
  }) {
    const { season } = await database.U({
      location: `seasons/${props.params._id}/form/syllabus`,
      data: props.data,
    });
    return { season: season as TSeason };
  }

  /**
   * USeasonFormEvaluation API
   * @description 학기 평가 양식 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USeasonFormEvaluation(props: {
    params: {
      _id: string;
    };
    data: {
      formEvaluation: TFormEvaluation;
    };
  }) {
    const { season } = await database.U({
      location: `seasons/${props.params._id}/form/evaluation`,
      data: props.data,
    });
    return { season: season as TSeason };
  }

  /**
   * DSeason API
   * @description 학기 삭제 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function DSeason(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.D({
      location: `seasons/${props.params._id}`,
    });
  }

  /**
   * ##########################################################################
   * Registration API
   * ##########################################################################
   */

  /**
   * CRegistration API
   * @description 학기 등록 정보 생성 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CRegistration(props: {
    data: {
      season: string;
      user: string;
      role: "teacher" | "student";
      grade?: string;
      group?: string;
      teacher?: string;
      subTeacher?: string;
    };
  }) {
    const { registration } = await database.C({
      location: "registrations",
      data: props.data,
    });
    return {
      registration: registration as TRegistration,
    };
  }

  /**
   * CCopyRegistrations API
   * @description 학기 등록 정보 복제 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CCopyRegistrations(props: {
    data: {
      toSeason: string;
      fromSeason: string;
    };
  }) {
    const { registrations } = await database.C({
      location: "registrations/copy",
      data: props.data,
    });
    return {
      registrations: registrations as TRegistration[],
    };
  }

  /**
   * RRegistrations API
   * @description 학기 등록 정보 목록 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RRegistrations(props: {
    query: {
      user?: string;
      school?: string;
      season?: string;
      role?: string;
    };
  }) {
    const { registrations } = await database.R({
      location: "registrations" + QUERY_BUILDER(props.query),
    });
    return {
      registrations: _.orderBy(
        registrations,
        [
          (reg) => reg?.period?.end ?? "",
          (reg) => (reg.role && reg.role !== "" ? reg.role : "_"),
          (reg) => (reg.grade && reg.grade !== "" ? reg.grade : "_"),
          "userName",
          "userId",
        ],
        ["desc", "asc", "asc", "asc", "asc"]
      ) as TRegistration[],
    };
  }

  /**
   * RRegistration API
   * @description 학기 등록 정보 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RRegistration(props: {
    params: {
      _id: string;
    };
  }) {
    const { registration } = await database.R({
      location: `registrations/${props.params._id}`,
    });
    return {
      registration: registration as TRegistration,
    };
  }

  /**
   * URegistration API
   * @description 학기 등록 정보 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function URegistration(props: {
    params: {
      _id: string;
    };
    data: {
      role: "teacher" | "student";
      grade?: string;
      group?: string;
      teacher?: string;
      subTeacher?: string;
    };
  }) {
    const { registration } = await database.U({
      location: `registrations/${props.params._id}`,
      data: props.data,
    });
    return {
      registration: registration as TRegistration,
    };
  }

  /**
   * DRegistration API
   * @description 학기 등록 정보 삭제 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function DRegistration(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.D({
      location: `registrations/${props.params._id}`,
    });
  }

  /**
   * ##########################################################################
   * Syllabus API
   * ##########################################################################
   */

  /**
   * CSyllabus API
   * @description 강의계획서 생성 API
   * @version 2.0.0
   * @auth user
   */
  async function CSyllabus(props: {
    data: {
      season: string;
      classTitle: string;
      point: number;
      subject: string[];
      teachers: { _id: string; userId: string; userName: string }[];
      classroom: string;
      time: { label: string; day?: string; start?: string; end?: string }[];
      info: any;
      limit: number;
    };
  }) {
    const { syllabus } = await database.C({
      location: `syllabuses`,
      data: props.data,
    });
    return { syllabus: syllabus as TSyllabus };
  }

  /**
   * RSyllabuses API
   * @description 강의계획서 목록 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RSyllabuses(props: {
    query: {
      season?: string;
      classroom?: string;
      confirmed?: boolean;
      user?: string;
      teacher?: string;
      student?: string;
    };
  }) {
    const { syllabuses, enrollments } = await database.R({
      location: `syllabuses` + QUERY_BUILDER(props.query),
    });
    return { syllabuses: syllabuses as TSyllabus[], enrollments };
  }

  /**
   * RSyllabuses API
   * @description 강의계획서 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RSyllabus(props: {
    params: {
      _id: string;
    };
  }) {
    const { syllabus } = await database.R({
      location: `syllabuses/${props.params._id}`,
    });
    return { syllabus: syllabus as TSyllabus };
  }

  /**
   * UConfirmSyllabus API
   * @description 강의계획서 승인 API
   * @version 2.0.0
   * @auth user
   */
  async function UConfirmSyllabus(props: {
    params: {
      _id: string;
    };
  }) {
    const { syllabus } = await database.C({
      location: `syllabuses/${props.params._id}/confirmed`,
      data: {},
    });
    return { syllabus: syllabus as TSyllabus };
  }

  /**
   * UCancleConfirmSyllabus API
   * @description 강의계획서 승인 취소 API
   * @version 2.0.0
   * @auth user
   */
  async function UCancleConfirmSyllabus(props: {
    params: {
      _id: string;
    };
  }) {
    const { syllabus } = await database.D({
      location: `syllabuses/${props.params._id}/confirmed`,
    });
    return { syllabus: syllabus as TSyllabus };
  }

  /**
   * USyllabus API
   * @description 강의계획서 수정 API
   * @version 2.0.0
   * @auth user
   */
  async function USyllabus(props: {
    params: {
      _id: string;
    };
    data: {
      classTitle: string;
      point: number;
      subject: string[];
      teachers: { _id: string; userId: string; userName: string }[];
      classroom: string;
      time: { label: string; day?: string; start?: string; end?: string }[];
      info: any;
      limit: number;
    };
  }) {
    const { syllabus } = await database.U({
      location: `syllabuses/${props.params._id}`,
      data: props.data,
    });
    return { syllabus: syllabus as TSyllabus };
  }

  /**
   * USyllabusSubject API
   * @description 강의계획서 교과목 수정 API
   * @version 2.0.0
   * @auth user
   */
  async function USyllabusSubject(props: {
    params: {
      _id: string;
    };
    data: {
      subject: string[];
    };
  }) {
    const { syllabus, changes } = await database.U({
      location: `syllabuses/${props.params._id}/subject`,
      data: props.data,
    });
    return { syllabus: syllabus as TSyllabus, changes };
  }

  /**
   * UHideSyllabusFromCalendar API
   * @description 캘린더(개별 지도 수업)에서 숨김 설정 API
   * @version 2.0.0
   * @auth user
   */
  async function UHideSyllabusFromCalendar(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.U({
      location: "syllabuses/" + props.params._id + "/hide",
      data: {},
    });
  }

  /**
   * UShowSyllabusOnCalendar API
   * @description 캘린더(멘토링 수업)에서 조회 설정 API
   * @version 2.0.0
   * @auth user
   */
  async function UShowSyllabusOnCalendar(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.U({
      location: "syllabuses/" + props.params._id + "/show",
      data: {},
    });
  }
  /**
   * DSyllabus API
   * @description 강의계획서 삭제 API
   * @version 2.0.0
   * @auth user
   */
  async function DSyllabus(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.D({
      location: "syllabuses/" + props.params._id,
    });
  }

  /**
   * ##########################################################################
   * Enrollment API
   * ##########################################################################
   */

  /**
   * CEnrollment API
   * @description 수강신청 API
   * @version 2.0.0
   * @auth user
   */
  async function CEnrollment(props: {
    data: {
      syllabus: string;
      registration: string;
      socketId?: string;
    };
  }) {
    return await database.C({
      location: `enrollments`,
      data: props.data,
    });
  }

  /**
   * REnrollments API
   * @description 수강 정보 목록 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function REnrollments(props: {
    query: {
      syllabus?: string;
      season?: string;
      student?: string;
    };
  }) {
    const { enrollments } = await database.R({
      location: `enrollments` + QUERY_BUILDER(props.query),
    });
    return { enrollments: _.sortBy(enrollments, "createdAt") as TEnrollment[] };
  }

  /**
   * REnrollment API
   * @description 수강 정보 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function REnrollment(props: {
    params: {
      _id: string;
    };
  }) {
    const { enrollment } = await database.R({
      location: `enrollments/${props.params._id}`,
    });
    return { enrollment: enrollment as TEnrollment };
  }

  /**
   * REnrollmentsWithEvaluation API
   * @description 평가 목록 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function REnrollmentsWithEvaluation(props: {
    query: {
      syllabus?: string;
      school?: string;
      student?: string;
    };
  }) {
    const { enrollments } = await database.R({
      location: `enrollments/evaluation` + QUERY_BUILDER(props.query),
    });
    return {
      enrollments: _.orderBy(
        enrollments,
        ["createdAt"],
        ["asc"]
      ) as TEnrollment[],
    };
  }

  /**
   * UEvaluation API
   * @description 평가 수정 API
   * @version 2.0.0
   * @auth user
   */
  async function UEvaluation(props: {
    params: {
      _id: string;
    };
    data: {
      evaluation: { [key: string]: string };
    };
  }) {
    return await database.U({
      location: `enrollments/${props.params._id}/evaluation`,
      data: props.data,
    });
  }

  /**
   * UEnrollmentMemo API
   * @description 수강 정보 메모 수정 수정 API
   * @version 2.0.0
   * @auth user
   */
  async function UEnrollmentMemo(props: {
    params: {
      _id: string;
    };
    data: {
      memo: string;
    };
  }) {
    return await database.U({
      location: `enrollments/${props.params._id}/memo`,
      data: props.data,
    });
  }

  /**
   * UHideEnrollmentFromCalendar API
   * @description 캘린더(수강 중인 수업)에서 숨김 설정 API
   * @version 2.0.0
   * @auth user
   */
  async function UHideEnrollmentFromCalendar(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.U({
      location: `enrollments/${props.params._id}/hide`,
      data: {},
    });
  }

  /**
   * UShowEnrollmentOnCalendar API
   * @description 캘린더(수강 중인 수업)에서 조회 설정 API
   * @version 2.0.0
   * @auth user
   */
  async function UShowEnrollmentOnCalendar(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.U({
      location: `enrollments/${props.params._id}/show`,
      data: {},
    });
  }

  /**
   * DEnrollment API
   * @description 수강 취소 API
   * @version 2.0.0
   * @auth user
   */
  async function DEnrollment(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.D({
      location: `enrollments/${props.params._id}`,
    });
  }

  /**
   * ##########################################################################
   * Archive API
   * ##########################################################################
   */

  /**
   * RArchiveByRegistration API
   * @description 아카이브 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RArchiveByRegistration(props: {
    query: {
      registration: string;
      label?: string;
    };
  }) {
    const { archive } = await database.R({
      location: "archives" + QUERY_BUILDER(props.query),
    });
    return {
      archive: archive as {
        _id: string;
        user: string;
        data: any;
      },
    };
  }

  /**
   * UArchiveByRegistration API
   * @description 아카이브 수정 API
   * @version 2.0.0
   * @auth user
   */
  async function UArchiveByRegistration(props: {
    params: { _id: string };
    data: { label: string; data: object; registration: string };
  }) {
    const { archive } = await database.U({
      location: `archives/${props.params._id}`,
      data: props.data,
    });
    return {
      archive: archive as {
        _id: string;
        user: string;
        data: any;
      },
    };
  }

  /**
   * ##########################################################################
   * Form API
   * ##########################################################################
   */

  /**
   * CForm API
   * @description 양식 생성 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CForm(props: {
    data: {
      type: "syllabus" | "timetable" | "print";
      title: string;
      data: object[];
    };
  }) {
    const { form } = await database.C({ location: "forms", data: props.data });

    return { form };
  }

  /**
   * CCopyForm API
   * @description 양식 복사 생성 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CCopyForm(props: {
    params: {
      _id: string;
    };
  }) {
    const { form } = await database.C({
      location: `forms/${props.params._id}/copy`,
      data: {},
    });

    return { form };
  }

  /**
   * RForms API
   * @description 양식 목록 조회 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function RForms(props: {
    query?: {
      type: "syllabus" | "timetable" | "print";
      archived?: boolean;
    };
  }) {
    const { forms } = await database.R({
      location: "forms" + QUERY_BUILDER(props.query),
    });
    return { forms };
  }

  /**
   * RForm API
   * @description 양식 조회 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function RForm(props: { params: { _id: string } }) {
    const { form } = await database.R({
      location: `forms/${props.params._id}`,
    });
    return { form };
  }

  /**
   * UForm API
   * @description 양식 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function UForm(props: {
    params: {
      _id: string;
    };
    data: {
      title: string;
      data: object[];
    };
  }) {
    const { form } = await database.U({
      location: `forms/${props.params._id}`,
      data: props.data,
    });

    return { form };
  }

  /**
   * UArchiveForm API
   * @description 양식 보관 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function UArchiveForm(props: {
    params: {
      _id: string;
    };
  }) {
    const { form } = await database.U({
      location: `forms/${props.params._id}/archive`,
      data: {},
    });

    return { form };
  }

  /**
   * URestoreForm API
   * @description 양식 복원 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function URestoreForm(props: {
    params: {
      _id: string;
    };
  }) {
    const { form } = await database.U({
      location: `forms/${props.params._id}/restore`,
      data: {},
    });

    return { form };
  }

  /**
   * DForm API
   * @description 양식 삭제 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function DForm(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.D({
      location: `forms/${props.params._id}`,
    });
  }

  /**
   * ##########################################################################
   * File API
   * ##########################################################################
   */

  /**
   * CUploadFileArchive API
   * @description 아카이브 파일 업로드 API
   * @version 2.0.0
   * @auth user
   */
  async function CUploadFileArchive(props: { data: FormData }) {
    const { originalName, key, url, preSignedUrl, expiryDate } =
      await database.C({
        location: "files/archive",
        data: props.data,
      });
    return {
      originalName: originalName as string,
      key: key as string,
      url: url as string,
      preSignedUrl: preSignedUrl as string,
      expiryDate: expiryDate as string,
    };
  }

  /**
   * RSignedUrlArchive API
   * @description 서명된 아카이브 파일 주소 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RSignedUrlArchive(props: {
    query: {
      key: string;
      archive: string;
      label: string;
      fieldLabel: string;
      fileName: string;
    };
  }) {
    const { preSignedUrl, expiryDate } = await database.R({
      location: "files/archive/signed" + QUERY_BUILDER(props.query),
    });
    return {
      preSignedUrl: preSignedUrl as string,
      expiryDate: expiryDate as string,
    };
  }

  /**
   * RSignedUrlDocument API
   * @description 서명된 문서 파일 주소 조회
   * @version 2.0.0
   * @auth user
   */
  async function RSignedUrlDocument(props: {
    query: {
      key: string;
      fileName: string;
    };
  }) {
    const { preSignedUrl, expiryDate } = await database.R({
      location: "files/document/signed" + QUERY_BUILDER(props.query),
    });
    return {
      preSignedUrl: preSignedUrl as string,
      expiryDate: expiryDate as string,
    };
  }

  /**
   * RSignedUrlBackup API
   * @description 서명된 백업 파일 주소 조회
   * @version 2.0.0
   * @auth owner
   */
  async function RSignedUrlBackup(props: {
    query: {
      key: string;
      fileName: string;
    };
  }) {
    const { preSignedUrl, expiryDate } = await database.R({
      location: "files/backup/signed" + QUERY_BUILDER(props.query),
    });
    return {
      preSignedUrl: preSignedUrl as string,
      expiryDate: expiryDate as string,
    };
  }

  /**
   * ##########################################################################
   * Form API
   * ##########################################################################
   */

  /**
   * CNotification API
   * @description 알림 생성 API
   * @version 2.0.0
   * @auth user
   */
  async function CNotification(props: {
    data: {
      toUserList: { user: string; userId: string; userName: string }[];
      category?: string;
      title: string;
      description: string;
    };
  }) {
    return await database.C({ location: "notifications", data: props.data });
  }

  /**
   * RNotifications API
   * @description 알림 목록 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RNotifications(props: {
    query: {
      type: "received" | "sent";
      checked?: boolean;
    };
  }) {
    const { notifications } = await database.R({
      location: "notifications" + QUERY_BUILDER(props.query),
    });

    return {
      notifications: _.sortBy(
        notifications,
        "createdAt"
      ).reverse() as TNotification[],
    };
  }

  /**
   * RNotification API
   * @description 알림 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RNotification(props: {
    params: {
      _id: string;
    };
  }) {
    const { notification } = await database.R({
      location: `notifications/${props.params._id}`,
    });

    return { notification: notification as TNotification };
  }

  /**
   * UCheckNotification API
   * @description 알림 확인 API
   * @version 2.0.0
   * @auth user
   */
  async function UCheckNotification(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.U({
      location: `notifications/${props.params._id}/check`,
      data: {},
    });
  }

  /**
   * DNotification API
   * @description 알림 삭제 API
   * @version 2.0.0
   * @auth user
   */
  async function DNotification(props: {
    params: {
      _id: string;
    };
  }) {
    return await database.D({
      location: `notifications/${props.params._id}`,
    });
  }

  return {
    AcademyAPI: {
      CAcademy,
      RAcademy,
      RAcademies,
      UAcademyEmail,
      UAcademyTel,
      UActivateAcademy,
      UInactivateAcademy,
      CAcademyBackup,
      URestoreAcademy,
      RAcademyBackupList,
      RAcademyBackup,
      DAcademyBackup,
      RAcademyDocuments,
      RAcademyDocument,
      DAcademy,
    },
    UserAPI: {
      LoginLocal,
      LoginGoogle,
      Logout,
      CUser,
      RUsers,
      RUser,
      RMySelf,
      RUserProfile,
      UUserProfile,
      UUserCalendar,
      UUserPassword,
      UUserEmail,
      UUserTel,
      UUserAuth,
      CGoogleAuth,
      DGoogleAuth,
      CUserSchool,
      DUserSchool,
      DUser,
    },
    SchoolAPI: {
      CSchool,
      RSchools,
      RSchool,
      USchoolFormArchive,
      USchoolLinks,
      USchoolCalendars,
      DSchool,
    },
    SeasonAPI: {
      CSeason,
      RSeasons,
      RSeason,
      UActivateSeason,
      UInactivateSeason,
      USeasonPeriod,
      USeasonClassrooms,
      USeasonSubjects,
      USeasonFormTimetable,
      USeasonFormSyllabus,
      USeasonFormEvaluation,
      USeasonPermission,
      CSeasonPermissionException,
      DSeasonPermissionException,
      DSeason,
    },
    RegistrationAPI: {
      CRegistration,
      CCopyRegistrations,
      RRegistrations,
      RRegistration,
      URegistration,
      DRegistration,
    },
    SyllabusAPI: {
      CSyllabus,
      RSyllabuses,
      RSyllabus,
      UConfirmSyllabus,
      UCancleConfirmSyllabus,
      USyllabus,
      USyllabusSubject,
      UHideSyllabusFromCalendar,
      UShowSyllabusOnCalendar,
      DSyllabus,
    },
    EnrollmentAPI: {
      CEnrollment,
      REnrollments,
      REnrollment,
      REnrollmentsWithEvaluation,
      UEvaluation,
      UEnrollmentMemo,
      UHideEnrollmentFromCalendar,
      UShowEnrollmentOnCalendar,
      DEnrollment,
    },
    ArchiveAPI: {
      RArchiveByRegistration,
      UArchiveByRegistration,
    },
    FormAPI: {
      CForm,
      CCopyForm,
      RForms,
      RForm,
      UForm,
      UArchiveForm,
      URestoreForm,
      DForm,
    },
    FileAPI: {
      CUploadFileArchive,
      RSignedUrlArchive,
      RSignedUrlDocument,
      RSignedUrlBackup,
    },
    NotificationAPI: {
      CNotification,
      RNotifications,
      RNotification,
      UCheckNotification,
      DNotification,
    },
  };
}
