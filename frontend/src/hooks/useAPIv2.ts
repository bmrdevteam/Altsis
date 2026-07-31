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
import {
  TSchool,
  TSchoolFormArchive,
  TDeletedSchoolFormArchive,
  TAcademyFeatures,
} from "types/schools";
import { TDashboard } from "types/dashboard";
import {
  TFormEvaluation,
  TSeason,
  TSeasonWithRegistrations,
} from "types/seasons";
import { TRegistration } from "types/registrations";
import { TSyllabus } from "types/syllabuses";
import { TEnrollment } from "types/enrollments";
import { TNotification, TNotificationSettings } from "types/notification";
import { TChatRoom, TChatMessage, TChatUser, TChatRoomSettings, TChatFile } from "types/chat";
import { TBoard, TBoardFavorite, TBoardMembers, TBoardNotificationEvents } from "types/board";
import { TPost, TPostAttachment } from "types/post";

import {
  TSurvey,
  TSurveyResponse,
  TSurveyStats,
  TSurveyFileInfo,
  TSurveyExportData,
  TSurveyAnswer,
} from "types/survey";
import { TAltForm, TAltFormField, TAltFormSettings } from "types/altForm";
import { TAltSheet, TAltSheetRow } from "types/altSheet";
import { TAIChatSession, TAIChatMessage } from "types/aiChat";

function QUERY_BUILDER(params?: object) {
  let query = "";
  if (params) {
    query = "?";
    for (const [key, value] of Object.entries(params)) {
      query = query.concat(`${key}=${encodeURIComponent(value)}&`);
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
   * UAcademyChatEnabled API
   * @description 아카데미 채팅 기능 활성화/비활성화 API
   * @version 1.0.0
   * @auth owner
   */
  async function UAcademyChatEnabled(props: {
    params: {
      academyId: string;
    };
    data: {
      chatEnabled: boolean;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/chat`,
      data: props.data,
    });
    return { academy: academy as TAcademy };
  }

  /**
   * UAcademyBoardEnabled API
   * @description 아카데미 보드 기능 활성화/비활성화 API
   * @version 1.0.0
   * @auth owner
   */
  async function UAcademyBoardEnabled(props: {
    params: {
      academyId: string;
    };
    data: {
      boardEnabled: boolean;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/board`,
      data: props.data,
    });
    return { academy: academy as TAcademy };
  }

  /**
   * UAcademyAiEnabled API
   * @description 아카데미 AI 기능 활성화/비활성화 API
   * @version 1.0.0
   * @auth owner
   */
  async function UAcademyAiEnabled(props: {
    params: {
      academyId: string;
    };
    data: {
      aiEnabled: boolean;
    };
  }) {
    const { academy } = await database.U({
      location: `academies/${props.params.academyId}/ai`,
      data: props.data,
    });
    return { academy: academy as TAcademy };
  }

  /**
   * UAcademyAiApiKey API
   * @description 아카데미 AI API 키 설정 API
   * @version 1.0.0
   * @auth owner
   */
  async function UAcademyAiApiKey(props: {
    params: {
      academyId: string;
    };
    data: {
      apiKey: string;
      aiModel?: string;
    };
  }) {
    const { success } = await database.U({
      location: `academies/${props.params.academyId}/ai/apikey`,
      data: props.data,
    });
    return { success: success as boolean };
  }

  /**
   * RAcademyAiApiKey API
   * @description 아카데미 AI API 키 존재 여부 확인 API
   * @version 1.0.0
   * @auth owner
   */
  async function RAcademyAiApiKey(props: {
    params: {
      academyId: string;
    };
  }) {
    const { hasApiKey, aiModel } = await database.R({
      location: `academies/${props.params.academyId}/ai/apikey`,
    });
    return { hasApiKey: hasApiKey as boolean, aiModel: aiModel as string };
  }

  /**
   * UAcademyAiModel API
   * @description 아카데미 AI 모델 설정 API
   * @version 1.0.0
   * @auth owner
   */
  async function UAcademyAiModel(props: {
    params: {
      academyId: string;
    };
    data: {
      aiModel: string;
    };
  }) {
    const { success } = await database.U({
      location: `academies/${props.params.academyId}/ai/model`,
      data: props.data,
    });
    return { success: success as boolean };
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
   * @auth admin|owner
   */
  async function UUserAuth(props: {
    params: {
      uid: string;
    };
    data: {
      auth: "admin" | "manager" | "member";
    };
  }) {
    const { auth } = await database.U({
      location: `users/${props.params.uid}/auth`,
      data: props.data,
    });

    return { auth: auth as "admin" | "member" | "manager" };
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
   * UUserName API
   * @description 이름 변경 API
   * @version 2.0.0
   * @auth admin|user
   */
  async function UUserName(props: {
    params: {
      uid: string;
    };
    data: {
      userName: string;
    };
  }) {
    const { userName } = await database.U({
      location: `users/${props.params.uid}/userName`,
      data: props.data,
    });

    return { userName: userName as string };
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
   * @auth admin|owner
   */
  async function CUser(props: {
    data: {
      schools: { school: string }[];
      auth: "admin" | "member" | "manager";
      userId: string;
      userName: string;
      password: string;
      tel?: string;
      email?: string;
      snsId?: {
        google?: string;
      };
      academyId?: string;
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
   * @auth user|owner
   */
  async function RSchools(props?: {
    query?: {
      academyId?: string; // required for owner
    };
  }) {
    const { schools } = await database.R({
      location: "schools" + QUERY_BUILDER(props?.query),
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
    const { school, academyFeatures } = await database.R({
      location: `schools/${props.params._id}`,
    });
    return {
      school: school as TSchool,
      academyFeatures: academyFeatures as TAcademyFeatures | undefined,
    };
  }

  /**
   * RSchoolDashboard API
   * @description 학교 대시보드 통계 조회 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function RSchoolDashboard(props: {
    params: {
      _id: string;
    };
  }) {
    const { dashboard } = await database.R({
      location: `schools/${props.params._id}/dashboard`,
    });
    return {
      dashboard: dashboard as TDashboard,
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

  async function USchoolBoardCreationPermission(props: {
    params: { _id: string };
    data: {
      boardCreationPermission: { teacher: boolean; student: boolean };
    };
  }) {
    const { boardCreationPermission } = await database.U({
      location: `schools/${props.params._id}/boardCreationPermission`,
      data: props.data,
    });
    return {
      boardCreationPermission: boardCreationPermission as {
        teacher: boolean;
        student: boolean;
      },
    };
  }

  async function USchoolBoardNotificationEvents(props: {
    params: { _id: string };
    data: {
      boardNotificationEvents: TBoardNotificationEvents;
    };
  }) {
    const { boardNotificationEvents } = await database.U({
      location: `schools/${props.params._id}/boardNotificationEvents`,
      data: props.data,
    });
    return {
      boardNotificationEvents: boardNotificationEvents as TBoardNotificationEvents,
    };
  }

  /**
   * USchoolFeatureFlags API
   * @description 학교 기능 활성화 설정 API
   * @version 1.0.0
   * @auth admin|manager
   */
  async function USchoolFeatureFlags(props: {
    params: { _id: string };
    data: {
      chatEnabled?: boolean;
      boardEnabled?: boolean;
      aiEnabled?: boolean;
    };
  }) {
    const { features } = await database.U({
      location: `schools/${props.params._id}/features`,
      data: props.data,
    });
    return {
      features: features as {
        chatEnabled: boolean;
        boardEnabled: boolean;
        aiEnabled: boolean;
      },
    };
  }

  /**
   * RestoreFormArchive API
   * @description 삭제된 기록 양식 복원 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function RestoreFormArchive(props: {
    params: {
      _id: string;
      label: string;
    };
  }) {
    const { formArchive, deletedFormArchive } = await database.U({
      location: `schools/${props.params._id}/deletedFormArchive/${encodeURIComponent(props.params.label)}/restore`,
      data: {},
    });
    return {
      formArchive: formArchive as TSchoolFormArchive,
      deletedFormArchive: deletedFormArchive as TDeletedSchoolFormArchive,
    };
  }

  /**
   * RemoveFormArchive API
   * @description 삭제된 기록 양식 완전 삭제 API (휴지통에서 영구 삭제)
   * @version 2.0.0
   * @auth admin|manager
   */
  async function RemoveFormArchive(props: {
    params: {
      _id: string;
      label: string;
    };
  }) {
    const { deletedFormArchive } = await database.D({
      location: `schools/${props.params._id}/deletedFormArchive/${encodeURIComponent(props.params.label)}`,
    });
    return {
      deletedFormArchive: deletedFormArchive as TDeletedSchoolFormArchive,
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
   * CalendarEvent API
   * ##########################################################################
   */

  /**
   * CCalendarEvent API
   * @description 캘린더 일정 생성 API
   * @version 1.0.0
   * @auth user
   */
  async function CCalendarEvent(props: {
    data: {
      title: string;
      description?: string;
      start: string;
      end: string;
      isAllDay?: boolean;
      scope: "school" | "personal";
      school?: string;
      recurrence?: {
        type: "none" | "daily" | "weekly" | "monthly";
        endDate?: string;
        days?: number[];
      };
      color?: string;
      calendarId?: string;
      reminder?: {
        enabled: boolean;
        minutesBefore?: number;
        useDefault?: boolean;
      };
    };
  }) {
    const { calendarEvent } = await database.C({
      location: "calendar-events",
      data: props.data,
    });
    return { calendarEvent };
  }

  /**
   * RCalendarEvents API
   * @description 캘린더 일정 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RCalendarEvents(props: {
    query: {
      startDate: string;
      endDate: string;
      scope?: string;
      school?: string;
      user?: string;
    };
  }) {
    const { calendarEvents } = await database.R({
      location: "calendar-events" + QUERY_BUILDER(props.query),
    });
    return { calendarEvents: calendarEvents as any[] };
  }

  /**
   * UCalendarEvent API
   * @description 캘린더 일정 수정 API
   * @version 1.0.0
   * @auth user
   */
  async function UCalendarEvent(props: {
    params: { _id: string };
    data: {
      title?: string;
      description?: string;
      start?: string;
      end?: string;
      isAllDay?: boolean;
      recurrence?: {
        type: "none" | "daily" | "weekly" | "monthly";
        endDate?: string;
        days?: number[];
      };
      color?: string;
      calendarId?: string;
      reminder?: {
        enabled: boolean;
        minutesBefore?: number;
        useDefault?: boolean;
      };
    };
  }) {
    const { calendarEvent } = await database.U({
      location: `calendar-events/${props.params._id}`,
      data: props.data,
    });
    return { calendarEvent };
  }

  /**
   * DCalendarEvent API
   * @description 캘린더 일정 삭제 API
   * @version 1.0.0
   * @auth user
   */
  async function DCalendarEvent(props: { params: { _id: string } }) {
    return await database.D({
      location: `calendar-events/${props.params._id}`,
    });
  }

  /**
   * SyncCalendarEvents API
   * @description 수강/멘토링 일정을 캘린더 일정으로 동기화
   * @version 1.0.0
   * @auth user
   */
  async function SyncCalendarEvents(props: {
    data: { season: string; targetUser?: string };
  }) {
    const result = await database.C({
      location: "calendar-events/sync",
      data: props.data,
    });
    return result as { synced: number; removed: number; total: number };
  }

  /**
   * ##########################################################################
   * UserCalendar API
   * ##########################################################################
   */

  /**
   * CUserCalendar API
   * @description 사용자 캘린더 생성 API
   */
  async function CUserCalendar(props: {
    data: {
      name: string;
      color?: string;
      scope?: "school" | "personal";
      school?: string;
    };
  }) {
    const { userCalendar } = await database.C({
      location: "user-calendars",
      data: props.data,
    });
    return { userCalendar };
  }

  /**
   * RUserCalendars API
   * @description 사용자 캘린더 목록 조회 API
   */
  async function RUserCalendars(props?: {
    query?: { school?: string };
  }) {
    const { userCalendars } = await database.R({
      location: "user-calendars" + QUERY_BUILDER(props?.query),
    });
    return { userCalendars: userCalendars as any[] };
  }

  /**
   * UUserCalendar API
   * @description 사용자 캘린더 수정 API
   */
  async function UUserCalendar(props: {
    params: { _id: string };
    data: { name?: string; color?: string };
  }) {
    const { userCalendar } = await database.U({
      location: `user-calendars/${props.params._id}`,
      data: props.data,
    });
    return { userCalendar };
  }

  /**
   * DUserCalendar API
   * @description 사용자 캘린더 삭제 API
   */
  async function DUserCalendar(props: { params: { _id: string } }) {
    return await database.D({
      location: `user-calendars/${props.params._id}`,
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
      copyFromData?: any; // 다른 학교에서 가져온 학기 JSON 데이터
      copyRecurringEvents?: boolean;
      copySchoolCalendar?: boolean;
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
   * RSeasonFormUsage API
   * @description 학기 양식별 데이터 사용 여부 조회 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function RSeasonFormUsage(props: {
    params: {
      _id: string;
    };
  }) {
    const { usage } = await database.R({
      location: `seasons/${props.params._id}/form/usage`,
    });
    return {
      usage: usage as {
        evaluation: boolean;
        syllabus: boolean;
        timetable: boolean;
      },
    };
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
   * USeasonBasic API
   * @description 학기 기본 정보 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function USeasonBasic(props: {
    params: {
      _id: string;
    };
    data: {
      year?: string;
      term?: string;
    };
  }) {
    const { season } = await database.U({
      location: `seasons/${props.params._id}/basic`,
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
   * USeasonAiSettings API
   * @description 학기 AI 설정 수정 API
   * @version 1.0.0
   * @auth admin|manager
   */
  async function USeasonAiSettings(props: {
    params: {
      _id: string;
    };
    data: {
      enabled?: boolean;
      permission?: {
        teacher?: boolean;
        student?: boolean;
      };
      guidelines?: string;
      references?: { title: string; content: string }[];
    };
  }) {
    const { season } = await database.U({
      location: `seasons/${props.params._id}/ai`,
      data: props.data,
    });
    return { season: season as TSeason };
  }

  /**
   * CSeasonAiReferenceUpload API
   * @description AI 참고 자료 파일 업로드 API
   * @version 1.0.0
   * @auth admin|manager
   */
  async function CSeasonAiReferenceUpload(props: {
    params: { _id: string };
    data: FormData;
  }) {
    const { season } = await database.C({
      location: `seasons/${props.params._id}/ai/reference/upload`,
      data: props.data,
    });
    return { season: season as TSeason };
  }

  /**
   * RSeasonAiReferenceDownload API
   * @description AI 참고 자료 파일 다운로드 URL 조회 API
   * @version 1.0.0
   * @auth admin|manager
   */
  async function RSeasonAiReferenceDownload(props: {
    params: { _id: string; index: number };
  }) {
    const { url } = await database.R({
      location: `seasons/${props.params._id}/ai/reference/${props.params.index}/download`,
    });
    return { url: url as string };
  }

  /**
   * DSeasonAiReference API
   * @description AI 참고 자료 삭제 API (S3 파일 포함)
   * @version 1.0.0
   * @auth admin|manager
   */
  async function DSeasonAiReference(props: {
    params: { _id: string; index: number };
  }) {
    const { season } = await database.D({
      location: `seasons/${props.params._id}/ai/reference/${props.params.index}`,
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
      coverImage?: string;
      coverColor?: string;
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
      coverImage?: string;
      coverColor?: string;
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
   * @description 캘린더(멘토링 수업)에서 숨김 설정 API
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
   * USyllabusCoverImage API
   * @description 강의계획서 커버 이미지 업로드 API
   * @version 1.0.0
   * @auth user
   */
  async function USyllabusCoverImage(props: {
    params: { _id: string };
    data: FormData;
  }) {
    const { coverImage } = await database.U({
      location: `syllabuses/${props.params._id}/cover-image`,
      data: props.data,
    });
    return { coverImage: coverImage as string };
  }

  /**
   * DSyllabusCoverImage API
   * @description 강의계획서 커버 이미지 삭제 API
   * @version 1.0.0
   * @auth user
   */
  async function DSyllabusCoverImage(props: { params: { _id: string } }) {
    return await database.D({
      location: `syllabuses/${props.params._id}/cover-image`,
    });
  }

  async function CSyllabusAltBoard(props: { params: { _id: string } }) {
    const { board } = await database.C({
      location: `syllabuses/${props.params._id}/alt-board`,
      data: {},
    });
    return { board: board as TBoard };
  }

  async function RSyllabusAltBoard(props: { params: { _id: string } }) {
    const { board } = await database.R({
      location: `syllabuses/${props.params._id}/alt-board`,
    });
    return { board: board as TBoard | null };
  }

  async function USyllabusAltBoardSync(props: { params: { _id: string } }) {
    const { board, added, removed } = await database.U({
      location: `syllabuses/${props.params._id}/alt-board/sync`,
      data: {},
    });
    return { board: board as TBoard, added: added as number, removed: removed as number };
  }

  async function LinkSyllabusAltBoard(props: {
    params: { _id: string };
    data: { board: string };
  }) {
    const { board, syllabus } = await database.C({
      location: `syllabuses/${props.params._id}/alt-board/link`,
      data: props.data,
    });
    return { board: board as TBoard, syllabus };
  }

  /**
   * ImportEvaluationFromBoard API
   * @description 수업 보드 활동 양식 응답을 평가 빈 칸에만 반영
   */
  async function ImportEvaluationFromBoard(props: {
    params: { _id: string };
    data: {
      form: string;
      mappings: { fieldId: string; evaluationLabel: string }[];
    };
  }) {
    return (await database.C({
      location: `syllabuses/${props.params._id}/evaluation/import-from-board`,
      data: props.data,
    })) as {
      filled: number;
      skippedExisting: number;
      skippedNoResponse: number;
      skippedNoValue: number;
      skippedNoPermission: number;
    };
  }

  /**
   * ImportEvaluationFromCsv API
   * @description CSV 행의 평가값을 빈 칸에만 반영
   */
  async function ImportEvaluationFromCsv(props: {
    params: { _id: string };
    data: {
      rows: {
        studentId: string;
        evaluation: { [label: string]: string | number };
      }[];
    };
  }) {
    return (await database.C({
      location: `syllabuses/${props.params._id}/evaluation/import-from-csv`,
      data: props.data,
    })) as {
      filled: number;
      skippedExisting: number;
      skippedNoValue: number;
      skippedNoPermission: number;
      skippedUnknownStudent: number;
      skippedUnknownLabel: number;
    };
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
   * UFormPermission API
   * @description 양식 열람 권한 수정 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function UFormPermission(props: {
    params: { _id: string };
    data: { teacher?: boolean; student?: boolean };
  }) {
    const { form } = await database.U({
      location: `forms/${props.params._id}/permission`,
      data: props.data,
    });
    return { form };
  }

  /**
   * CFormPermissionException API
   * @description 양식 열람 권한 예외 추가 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CFormPermissionException(props: {
    params: { _id: string };
    data: {
      user: string;
      userId: string;
      userName: string;
      isAllowed: boolean;
    };
  }) {
    const { form } = await database.C({
      location: `forms/${props.params._id}/permission/exceptions`,
      data: props.data,
    });
    return { form };
  }

  /**
   * DFormPermissionException API
   * @description 양식 열람 권한 예외 삭제 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function DFormPermissionException(props: {
    params: { _id: string };
    query: { userId: string };
  }) {
    const { form } = await database.D({
      location:
        `forms/${props.params._id}/permission/exceptions` +
        QUERY_BUILDER(props.query),
    });
    return { form };
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

  /**
   * RNotificationSettings API
   * @description 알림 설정 조회 API
   * @version 2.0.0
   * @auth user
   */
  async function RNotificationSettings() {
    const { settings } = await database.R({
      location: "notifications/settings",
    });
    return { settings: settings as TNotificationSettings };
  }

  /**
   * UNotificationSettings API
   * @description 알림 설정 수정 API
   * @version 2.0.0
   * @auth user
   */
  async function UNotificationSettings(props: {
    data: Partial<TNotificationSettings>;
  }) {
    const { settings } = await database.U({
      location: "notifications/settings",
      data: props.data,
    });
    return { settings: settings as TNotificationSettings };
  }

  // ============================================================
  // CalendarSettings API
  // ============================================================

  /**
   * RCalendarSettings API
   * @description 캘린더 설정 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RCalendarSettings() {
    const { visibleDays, referenceTime, categoryColors } = await database.R({
      location: "calendar-settings/settings",
    });
    return {
      visibleDays: visibleDays as number[],
      referenceTime: referenceTime as string | null,
      categoryColors: categoryColors as Partial<{
        schoolCalendar: string;
        personalCalendar: string;
        enrollments: string;
        mentorings: string;
        memos: string;
      }>,
    };
  }

  /**
   * UCalendarSettings API
   * @description 캘린더 설정 수정 API
   * @version 1.0.0
   * @auth user
   */
  async function UCalendarSettings(props: {
    data: {
      visibleDays?: number[];
      referenceTime?: string | null;
      categoryColors?: Partial<{
        schoolCalendar: string | null;
        personalCalendar: string | null;
        enrollments: string | null;
        mentorings: string | null;
        memos: string | null;
      }>;
    };
  }) {
    const { visibleDays, referenceTime, categoryColors } = await database.U({
      location: "calendar-settings/settings",
      data: props.data,
    });
    return {
      visibleDays: visibleDays as number[],
      referenceTime: referenceTime as string | null,
      categoryColors: categoryColors as Partial<{
        schoolCalendar: string;
        personalCalendar: string;
        enrollments: string;
        mentorings: string;
        memos: string;
      }>,
    };
  }

  // ============================================================
  // ThemeSettings API
  // ============================================================

  /**
   * RThemeSettings API
   * @description 테마 설정 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RThemeSettings() {
    const { selectedTheme, colors } = await database.R({
      location: "theme-settings/settings",
    });
    return {
      selectedTheme: selectedTheme as string,
      colors: colors as {
        primaryColor: string;
        backgroundColor: string;
        componentColor: string;
        textColor: string;
        accentColor: string;
        successColor: string;
        errorColor: string;
      },
    };
  }

  /**
   * UThemeSettings API
   * @description 테마 설정 수정 API
   * @version 1.0.0
   * @auth user
   */
  async function UThemeSettings(props: {
    data: {
      selectedTheme?: string;
      colors?: Partial<{
        primaryColor: string;
        backgroundColor: string;
        componentColor: string;
        textColor: string;
        accentColor: string;
        successColor: string;
        errorColor: string;
      }>;
    };
  }) {
    const { selectedTheme, colors } = await database.U({
      location: "theme-settings/settings",
      data: props.data,
    });
    return {
      selectedTheme: selectedTheme as string,
      colors: colors as {
        primaryColor: string;
        backgroundColor: string;
        componentColor: string;
        textColor: string;
        accentColor: string;
        successColor: string;
        errorColor: string;
      },
    };
  }

  /**
   * UBulkCheckNotifications API
   * @description 알림 일괄 확인 API
   * @version 2.0.0
   * @auth user
   */
  async function UBulkCheckNotifications() {
    const { deletedCount, checkedCount } = await database.U({
      location: "notifications/bulk-check",
      data: {},
    });
    return {
      deletedCount: deletedCount as number,
      checkedCount: checkedCount as number,
    };
  }

  /**
   * ##########################################################################
   * Board API
   * ##########################################################################
   */

  /**
   * CBoard API
   * @description 게시판 생성 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CBoard(props: {
    data: {
      school: string;
      name: string;
      description?: string;
      contentViewMode?: "table" | "gallery" | "blog";
      coverColor?: string;
      members?: TBoardMembers;
      writers?: TBoardMembers;
      scope?: "school" | "season";
      season?: string;
    };
  }) {
    const { board } = await database.C({
      location: "boards",
      data: props.data,
    });
    return { board: board as TBoard };
  }

  /**
   * DuplicateBoard API
   * @description 보드 복제 (양식 구조 + 문서, 응답·채팅 비복사)
   */
  async function DuplicateBoard(props: {
    params: { _id: string };
    data?: { name?: string };
  }) {
    const { board } = await database.C({
      location: `boards/${props.params._id}/duplicate`,
      data: props.data || {},
    });
    return { board: board as TBoard };
  }

  /**
   * RBoards API
   * @description 게시판 목록 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RBoards(props: {
    query: { school: string; mode?: string; season?: string };
  }) {
    const { boards } = await database.R({
      location: "boards" + QUERY_BUILDER(props.query),
    });
    return { boards: boards as TBoard[] };
  }

  /**
   * RBoard API
   * @description 게시판 상세 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RBoard(props: { params: { _id: string } }) {
    const { board } = await database.R({
      location: `boards/${props.params._id}`,
    });
    return { board: board as TBoard };
  }

  /**
   * UBoard API
   * @description 게시판 수정 API
   * @version 1.0.0
   * @auth admin|manager
   */
  async function UBoard(props: {
    params: { _id: string };
    data: {
      name?: string;
      description?: string;
      order?: number;
      contentViewMode?: "table" | "gallery" | "blog";
      coverColor?: string;
      notificationEvents?: TBoardNotificationEvents;
      chatEnabled?: boolean;
    };
  }) {
    const { board } = await database.U({
      location: `boards/${props.params._id}`,
      data: props.data,
    });
    return { board: board as TBoard };
  }

  /**
   * DBoardLeave API
   * @description 보드 탈퇴 API (자기 자신을 멤버에서 제거)
   * @version 2.0.0
   * @auth user
   */
  async function DBoardLeave(props: { params: { _id: string } }) {
    return await database.D({
      location: `boards/${props.params._id}/leave`,
    });
  }

  /**
   * CBoardMemberUser API
   * @description 보드 개별 멤버 추가 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CBoardMemberUser(props: {
    params: { _id: string };
    data: {
      user: string;
      userId: string;
      userName: string;
    };
  }) {
    const { board } = await database.C({
      location: `boards/${props.params._id}/members/users`,
      data: props.data,
    });
    return { board: board as TBoard };
  }

  /**
   * DBoardMemberUser API
   * @description 보드 개별 멤버 제거 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function DBoardMemberUser(props: {
    params: { _id: string };
    query: { userId: string };
  }) {
    const { board } = await database.D({
      location:
        `boards/${props.params._id}/members/users` +
        QUERY_BUILDER(props.query),
    });
    return { board: board as TBoard };
  }

  /**
   * CBoardWriterUser API
   * @description 보드 개별 작성자 추가 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function CBoardWriterUser(props: {
    params: { _id: string };
    data: {
      user: string;
      userId: string;
      userName: string;
    };
  }) {
    const { board } = await database.C({
      location: `boards/${props.params._id}/writers/users`,
      data: props.data,
    });
    return { board: board as TBoard };
  }

  /**
   * DBoardWriterUser API
   * @description 보드 개별 작성자 제거 API
   * @version 2.0.0
   * @auth admin|manager
   */
  async function DBoardWriterUser(props: {
    params: { _id: string };
    query: { userId: string };
  }) {
    const { board } = await database.D({
      location:
        `boards/${props.params._id}/writers/users` +
        QUERY_BUILDER(props.query),
    });
    return { board: board as TBoard };
  }

  /**
   * RBoardMemberList API
   * @description 보드 멤버 사용자 목록 (resolved) 조회 API
   * @version 2.0.0
   */
  async function RBoardMemberList(props: {
    params: { _id: string };
    query?: { season?: string };
  }) {
    const { users } = await database.R({
      location:
        `boards/${props.params._id}/members/list` +
        QUERY_BUILDER(props.query),
    });
    return {
      users: users as { user: string; userId: string; userName: string; profile?: string }[],
    };
  }

  /**
   * DBoard API
   * @description 게시판 삭제 API
   * @version 1.0.0
   * @auth admin|manager
   */
  async function DBoard(props: { params: { _id: string } }) {
    return await database.D({
      location: `boards/${props.params._id}`,
    });
  }

  /**
   * UBoardCoverImage API
   * @description 보드 커버 이미지 업로드 API
   * @version 1.0.0
   * @auth user
   */
  async function UBoardCoverImage(props: {
    params: { _id: string };
    data: FormData;
  }) {
    const { coverImage } = await database.U({
      location: `boards/${props.params._id}/cover-image`,
      data: props.data,
    });
    return { coverImage: coverImage as string };
  }

  /**
   * DBoardCoverImage API
   * @description 보드 커버 이미지 삭제 API
   * @version 1.0.0
   * @auth user
   */
  async function DBoardCoverImage(props: { params: { _id: string } }) {
    return await database.D({
      location: `boards/${props.params._id}/cover-image`,
    });
  }

  /**
   * ##########################################################################
   * Board Favorite API
   * ##########################################################################
   */

  /**
   * RBoardFavorites API
   * @description 보드 즐겨찾기 목록 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RBoardFavorites(props: {
    query: { school: string };
  }) {
    const { boardFavorites } = await database.R({
      location: "board-favorites" + QUERY_BUILDER(props.query),
    });
    return { boardFavorites: boardFavorites as TBoardFavorite[] };
  }

  /**
   * CBoardFavorite API
   * @description 보드 즐겨찾기 추가 API
   * @version 1.0.0
   * @auth user
   */
  async function CBoardFavorite(props: {
    data: { board: string; school: string };
  }) {
    const { boardFavorite } = await database.C({
      location: "board-favorites",
      data: props.data,
    });
    return { boardFavorite: boardFavorite as TBoardFavorite };
  }

  /**
   * DBoardFavorite API
   * @description 보드 즐겨찾기 삭제 API (보드 ID로)
   * @version 1.0.0
   * @auth user
   */
  async function DBoardFavoriteByBoard(props: {
    params: { boardId: string };
  }) {
    return await database.D({
      location: `board-favorites/board/${props.params.boardId}`,
    });
  }

  /**
   * ##########################################################################
   * Post API
   * ##########################################################################
   */

  /**
   * CPost API
   * @description 게시글 생성 API
   * @version 1.0.0
   * @auth user
   */
  async function CPost(props: {
    data: {
      board: string;
      title: string;
      content: string;
      postType?: string;
      category?: string;
      attachments?: TPostAttachment[];
      permissionRead?: TBoardMembers;
      surveys?: TSurvey[];
      isDraft?: boolean;
    };
  }) {
    const { post } = await database.C({
      location: "posts",
      data: props.data,
    });
    return { post: post as TPost };
  }

  /**
   * RPosts API
   * @description 게시글 목록 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RPosts(props: {
    query: {
      board: string;
      limit?: number;
      before?: string;
    };
  }) {
    const { posts, board } = await database.R({
      location: "posts" + QUERY_BUILDER(props.query),
    });
    return { posts: posts as TPost[], board: board as TBoard };
  }

  /**
   * RPostUnreadCount API
   * @description 보드별 안 읽은 공개 게시글 수
   */
  async function RPostUnreadCount(props: { query: { board: string } }) {
    const { count } = await database.R({
      location: "posts/unread-count" + QUERY_BUILDER(props.query),
    });
    return { count: (count as number) || 0 };
  }

  /**
   * RPost API
   * @description 게시글 상세 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RPost(props: {
    params: { _id: string };
    query?: {
      merge?: "true";
      userId?: string;
      filters?: string;
      skipRead?: "true";
    };
  }) {
    const { post, board } = await database.R({
      location:
        `posts/${props.params._id}` +
        (props.query ? QUERY_BUILDER(props.query) : ""),
    });
    return { post: post as TPost & { _mergeApplied?: boolean }, board: board as TBoard };
  }

  /**
   * UPost API
   * @description 게시글 수정 API
   * @version 1.0.0
   * @auth user
   */
  async function UPost(props: {
    params: { _id: string };
    data: {
      title?: string;
      content?: string;
      category?: string;
      attachments?: TPostAttachment[];
      permissionRead?: TBoardMembers | null;
      surveys?: TSurvey[];
      isDraft?: boolean;
    };
  }) {
    const { post } = await database.U({
      location: `posts/${props.params._id}`,
      data: props.data,
    });
    return { post: post as TPost };
  }

  /**
   * UPostPin API
   * @description 게시글 고정/해제 API
   * @version 1.0.0
   * @auth admin|manager
   */
  async function UPostPin(props: {
    params: { _id: string };
    data: { isPinned: boolean };
  }) {
    const { post } = await database.U({
      location: `posts/${props.params._id}/pin`,
      data: props.data,
    });
    return { post: post as TPost };
  }

  /**
   * RPostReaders API
   * @description 게시글 열람 대상 사용자 목록 조회 API
   * @version 2.0.0
   */
  async function RPostReaders(props: {
    params: { _id: string };
  }) {
    const { users } = await database.R({
      location: `posts/${props.params._id}/readers`,
    });
    return {
      users: users as { user: string; userId: string; userName: string }[],
    };
  }

  /**
   * DPost API
   * @description 게시글 삭제 API
   * @version 1.0.0
   * @auth user
   */
  async function DPost(props: { params: { _id: string } }) {
    return await database.D({
      location: `posts/${props.params._id}`,
    });
  }

  async function DuplicatePost(props: { params: { _id: string } }) {
    const { post } = await database.C({
      location: `posts/${props.params._id}/duplicate`,
      data: {},
    });
    return { post: post as TPost };
  }

  /**
   * SearchPosts API
   * @description 게시물 검색 API (CommandPalette용)
   * @version 1.0.0
   * @auth user
   */
  async function SearchPosts(props: {
    query: { school: string; q: string };
  }) {
    const { posts } = await database.R({
      location: "posts/search" + QUERY_BUILDER(props.query),
    });
    return {
      posts: posts as (TPost & { boardName: string })[],
    };
  }

  /**
   * CUploadPostFile API
   * @description 게시글 첨부파일 업로드 API
   * @version 1.0.0
   * @auth user
   */
  async function CUploadPostFile(props: { data: FormData }) {
    const result = await database.C({
      location: "posts/upload",
      data: props.data,
    });
    return result as {
      fileName: string;
      fileSize: number;
      mimeType: string;
      key: string;
      url: string;
      isImage: boolean;
      viewUrl: string;
      preSignedUrl: string;
      expiryDate: string;
    };
  }

  /**
   * RSignedUrlPostFile API
   * @description 게시글 첨부파일 서명된 URL 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RSignedUrlPostFile(props: {
    query: { key: string; fileName: string; view?: string };
  }) {
    const { preSignedUrl, expiryDate } = await database.R({
      location: "posts/file/signed" + QUERY_BUILDER(props.query),
    });
    return {
      preSignedUrl: preSignedUrl as string,
      expiryDate: expiryDate as string | undefined,
    };
  }

  /**
   * RPostOgMeta API
   * @description 링크 OG 메타데이터 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RPostOgMeta(props: { query: { url: string } }) {
    const result = await database.R({
      location: "posts/og-meta" + QUERY_BUILDER(props.query),
    });
    return result as {
      ogTitle: string;
      ogDescription: string;
      ogImage: string;
    };
  }

  /**
   * ##########################################################################
   * SurveyResponse API
   * ##########################################################################
   */

  /**
   * CSurveyResponse API
   * @description 설문 응답 제출 API
   * @version 1.0.0
   * @auth user
   */
  async function CSurveyResponse(props: {
    data: {
      post: string;
      surveyId: string;
      answers: TSurveyAnswer[];
    };
  }) {
    const { surveyResponse } = await database.C({
      location: "survey-responses",
      data: props.data,
    });
    return { surveyResponse: surveyResponse as TSurveyResponse };
  }

  /**
   * RSurveyResponseMy API
   * @description 내 설문 응답 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RSurveyResponseMy(props: {
    query: { post: string; surveyId: string };
  }) {
    const { surveyResponse } = await database.R({
      location: "survey-responses/my" + QUERY_BUILDER(props.query),
    });
    return { surveyResponse: surveyResponse as TSurveyResponse | null };
  }

  /**
   * RSurveyResponses API
   * @description 설문 응답 전체 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RSurveyResponses(props: {
    query: { post: string; surveyId: string };
  }) {
    const { surveyResponses } = await database.R({
      location: "survey-responses" + QUERY_BUILDER(props.query),
    });
    return { surveyResponses: surveyResponses as TSurveyResponse[] };
  }

  /**
   * RSurveyStats API
   * @description 설문 통계 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RSurveyStats(props: {
    query: { post: string; surveyId: string };
  }) {
    const { stats } = await database.R({
      location: "survey-responses/stats" + QUERY_BUILDER(props.query),
    });
    return { stats: stats as TSurveyStats };
  }

  /**
   * USurveyResponse API
   * @description 설문 응답 수정 API
   * @version 1.0.0
   * @auth user
   */
  async function USurveyResponse(props: {
    params: { _id: string };
    data: { answers: TSurveyAnswer[] };
  }) {
    const { surveyResponse } = await database.U({
      location: `survey-responses/${props.params._id}`,
      data: props.data,
    });
    return { surveyResponse: surveyResponse as TSurveyResponse };
  }

  /**
   * ExportSurveyJSON API
   * @description 설문 JSON 내보내기 API
   * @version 1.0.0
   * @auth user
   */
  async function ExportSurveyJSON(props: {
    params: { postId: string; surveyId: string };
  }) {
    const result = await database.R({
      location: `survey-responses/export/${props.params.postId}/${props.params.surveyId}`,
    });
    return result as TSurveyExportData;
  }

  /**
   * CSurveyFileUpload API
   * @description 설문 파일 업로드 API
   * @version 1.0.0
   * @auth user
   */
  async function CSurveyFileUpload(props: {
    query: { post: string };
    data: FormData;
  }) {
    const result = await database.C({
      location: "survey-responses/upload" + QUERY_BUILDER(props.query),
      data: props.data,
    });
    return result as TSurveyFileInfo;
  }

  /**
   * RSurveyFileSignedUrl API
   * @description 설문 파일 signed URL 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RSurveyFileSignedUrl(props: {
    query: { key: string; fileName: string };
  }) {
    const { preSignedUrl, expiryDate } = await database.R({
      location: "survey-responses/file/signed" + QUERY_BUILDER(props.query),
    });
    return { preSignedUrl: preSignedUrl as string, expiryDate: expiryDate as string };
  }

  /**
   * ##########################################################################
   * Comment API
   * ##########################################################################
   */

  /**
   * CComment API
   * @description 댓글 생성 API
   * @version 1.0.0
   * @auth user
   */
  async function CComment(props: {
    data: {
      post: string;
      content: string;
      parentComment?: string;
    };
  }) {
    const { comment } = await database.C({
      location: "comments",
      data: props.data,
    });
    return { comment };
  }

  /**
   * RComments API
   * @description 댓글 목록 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RComments(props: { query: { post: string } }) {
    const { comments } = await database.R({
      location: "comments" + QUERY_BUILDER(props.query),
    });
    return { comments };
  }

  /**
   * UComment API
   * @description 댓글 수정 API
   * @version 1.0.0
   * @auth user
   */
  async function UComment(props: {
    params: { _id: string };
    data: { content: string };
  }) {
    const { comment } = await database.U({
      location: `comments/${props.params._id}`,
      data: props.data,
    });
    return { comment };
  }

  /**
   * DComment API
   * @description 댓글 삭제 API
   * @version 1.0.0
   * @auth user
   */
  async function DComment(props: { params: { _id: string } }) {
    return await database.D({
      location: `comments/${props.params._id}`,
    });
  }

  /**
   * RCommentCounts API
   * @description 여러 게시글의 댓글 수 일괄 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RCommentCounts(props: { query: { posts: string } }) {
    const { counts } = await database.R({
      location: "comments/counts" + QUERY_BUILDER(props.query),
    });
    return { counts } as { counts: Record<string, number> };
  }

  /**
   * ##########################################################################
   * Chat API
   * ##########################################################################
   */

  /**
   * RChatRooms API
   * @description 채팅방 목록 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RChatRooms(props?: { query?: { archived?: string } }) {
    const { rooms } = await database.R({
      location: "chats/rooms" + QUERY_BUILDER(props?.query),
    });
    return { rooms: rooms as TChatRoom[] };
  }

  /**
   * RChatRoom API
   * @description 채팅방 상세 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RChatRoom(props: { params: { roomId: string } }) {
    const { room } = await database.R({
      location: `chats/rooms/${props.params.roomId}`,
    });
    return { room: room as TChatRoom };
  }

  /**
   * CChatRoom API
   * @description 채팅방 생성 API
   * @version 1.0.0
   * @auth user
   */
  async function CChatRoom(props: {
    data: {
      type: "direct" | "group";
      participants: {
        user: string;
        userId: string;
        userName: string;
        profile?: string;
      }[];
      name?: string;
    };
  }) {
    const { room, existing } = await database.C({
      location: "chats/rooms",
      data: props.data,
    });
    return {
      room: room as TChatRoom,
      existing: existing as boolean | undefined,
    };
  }

  /**
   * UChatRoom API
   * @description 채팅방 수정 API (그룹 이름/설정 변경)
   * @version 1.0.0
   * @auth user
   */
  async function UChatRoom(props: {
    params: { roomId: string };
    data: { name?: string; settings?: TChatRoomSettings };
  }) {
    const { room } = await database.U({
      location: `chats/rooms/${props.params.roomId}`,
      data: props.data,
    });
    return { room: room as TChatRoom };
  }

  /**
   * DChatRoom API
   * @description 채팅방 나가기/삭제 API
   * @version 1.0.0
   * @auth user
   */
  async function DChatRoom(props: { params: { roomId: string } }) {
    return await database.D({
      location: `chats/rooms/${props.params.roomId}`,
    });
  }

  /**
   * CChatRoomParticipants API
   * @description 채팅방 참가자 추가 API
   * @version 1.0.0
   * @auth user
   */
  async function CChatRoomParticipants(props: {
    params: { roomId: string };
    data: {
      participants: {
        user: string;
        userId: string;
        userName: string;
        profile?: string;
      }[];
    };
  }) {
    const { room } = await database.C({
      location: `chats/rooms/${props.params.roomId}/participants`,
      data: props.data,
    });
    return { room: room as TChatRoom };
  }

  /**
   * DChatRoomParticipant API
   * @description 채팅방 참가자 제거 API (방장 전용)
   * @version 1.0.0
   * @auth user
   */
  async function DChatRoomParticipant(props: {
    params: { roomId: string; participantId: string };
  }) {
    const { room } = await database.D({
      location: `chats/rooms/${props.params.roomId}/participants/${props.params.participantId}`,
    });
    return { room: room as TChatRoom };
  }

  /**
   * RChatMessages API
   * @description 채팅 메시지 목록 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RChatMessages(props: {
    params: { roomId: string };
    query?: { limit?: number; before?: string };
  }) {
    const { messages } = await database.R({
      location:
        `chats/rooms/${props.params.roomId}/messages` +
        QUERY_BUILDER(props.query),
    });
    return { messages: messages as TChatMessage[] };
  }

  /**
   * CChatMessage API
   * @description 채팅 메시지 전송 API
   * @version 1.0.0
   * @auth user
   */
  async function CChatMessage(props: {
    params: { roomId: string };
    data: {
      content: string;
      messageType?: string;
      attachment?: {
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        key?: string;
      };
    };
  }) {
    const { message } = await database.C({
      location: `chats/rooms/${props.params.roomId}/messages`,
      data: props.data,
    });
    return { message: message as TChatMessage };
  }

  /**
   * DChatMessage API
   * @description 채팅 메시지 삭제 API
   * @version 1.0.0
   * @auth user
   */
  async function DChatMessage(props: {
    params: { roomId: string; messageId: string };
  }) {
    return await database.D({
      location: `chats/rooms/${props.params.roomId}/messages/${props.params.messageId}`,
    });
  }

  /**
   * UChatRoomRead API
   * @description 채팅방 읽음 처리 API
   * @version 1.0.0
   * @auth user
   */
  async function UChatRoomRead(props: { params: { roomId: string } }) {
    return await database.U({
      location: `chats/rooms/${props.params.roomId}/read`,
      data: {},
    });
  }

  /**
   * UChatRoomPin API
   * @description 채팅방 고정/고정해제 API
   * @version 1.0.0
   * @auth user
   */
  async function UChatRoomPin(props: { params: { roomId: string } }) {
    const { isPinned } = await database.U({
      location: `chats/rooms/${props.params.roomId}/pin`,
      data: {},
    });
    return { isPinned: isPinned as boolean };
  }

  /**
   * UChatRoomArchive API
   * @description 채팅방 보관/보관해제 API
   * @version 1.0.0
   * @auth user
   */
  async function UChatRoomArchive(props: { params: { roomId: string } }) {
    const { isArchived } = await database.U({
      location: `chats/rooms/${props.params.roomId}/archive`,
      data: {},
    });
    return { isArchived: isArchived as boolean };
  }

  /**
   * RChatUsers API
   * @description 채팅 가능한 사용자 검색 API
   * @version 1.0.0
   * @auth user
   */
  async function RChatUsers(props: {
    query?: { q?: string; sid?: string; seasonId?: string };
  }) {
    const { users } = await database.R({
      location: "chats/users" + QUERY_BUILDER(props.query),
    });
    return { users: users as TChatUser[] };
  }

  /**
   * CChatFileUpload API
   * @description 채팅 파일 업로드 API
   * @version 1.0.0
   * @auth user
   */
  async function CChatFileUpload(props: {
    params: { roomId: string };
    data: FormData;
  }) {
    const result = await database.C({
      location: `chats/rooms/${props.params.roomId}/upload`,
      data: props.data,
    });

    if (!result?.attachment) {
      console.error("[CChatFileUpload] Invalid response:", result);
      throw new Error("파일 업로드에 실패했습니다.");
    }

    return {
      attachment: result.attachment as {
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        key: string;
      },
    };
  }

  /**
   * RChatFiles API
   * @description 내 채팅 파일 목록 조회 API (개인 저장소)
   * @version 1.0.0
   * @auth user
   */
  async function RChatFiles(props: {
    query?: { fileType?: string; limit?: number; before?: string };
  }) {
    const { files } = await database.R({
      location: "chats/files" + QUERY_BUILDER(props.query),
    });
    return { files: files as TChatFile[] };
  }

  /**
   * DChatFile API
   * @description 채팅 파일 삭제 API
   * @version 1.0.0
   * @auth user
   */
  async function DChatFile(props: { params: { fileId: string } }) {
    return await database.D({
      location: `chats/files/${props.params.fileId}`,
    });
  }

  /**
   * RChatFileSignedUrl API
   * @description 채팅 파일 다운로드용 Signed URL 조회 API
   * @version 1.0.0
   * @auth user
   */
  async function RChatFileSignedUrl(props: { params: { fileId: string } }) {
    const { preSignedUrl, expiryDate } = await database.R({
      location: `chats/files/${props.params.fileId}/signed`,
    });
    return { preSignedUrl: preSignedUrl as string, expiryDate: expiryDate as string };
  }

  /**
   * ##########################################################################
   * Board Chat API
   * ##########################################################################
   */

  /**
   * RBoardChatRoom API
   * @description 보드 전체 채팅방 조회 (없으면 생성 + 참여자 동기화)
   */
  async function RBoardChatRoom(props: { params: { boardId: string } }) {
    const { room } = await database.R({
      location: `boards/${props.params.boardId}/chat/room`,
    });
    return { room: room as TChatRoom };
  }

  /**
   * RBoardChatRooms API
   * @description 보드 채팅방 목록 (전체 + 팀/주제방)
   */
  async function RBoardChatRooms(props: { params: { boardId: string } }) {
    const { rooms } = await database.R({
      location: `boards/${props.params.boardId}/chat/rooms`,
    });
    return { rooms: rooms as TChatRoom[] };
  }

  /**
   * CBoardChatRoom API
   * @description 보드 비공개 팀방 생성
   */
  async function CBoardChatRoom(props: {
    params: { boardId: string };
    data: { name: string; description?: string; memberIds?: string[] };
  }) {
    const { room } = await database.C({
      location: `boards/${props.params.boardId}/chat/rooms`,
      data: props.data,
    });
    return { room: room as TChatRoom };
  }

  /**
   * CBoardChatRoomParticipants API
   * @description 팀방 참여자 추가
   */
  async function CBoardChatRoomParticipants(props: {
    params: { boardId: string; roomId: string };
    data: { memberIds: string[] };
  }) {
    const { room } = await database.C({
      location: `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}/participants`,
      data: props.data,
    });
    return { room: room as TChatRoom };
  }

  /**
   * DBoardChatRoomParticipant API
   * @description 팀방 참여자 제거 / 나가기
   */
  async function DBoardChatRoomParticipant(props: {
    params: { boardId: string; roomId: string; userId: string };
  }) {
    const { room } = await database.D({
      location: `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}/participants/${props.params.userId}`,
    });
    return { room: room as TChatRoom };
  }

  /**
   * UBoardChatRoom API
   * @description 보드 채팅방 이름/설명 수정
   */
  async function UBoardChatRoom(props: {
    params: { boardId: string; roomId: string };
    data: { name?: string; description?: string };
  }) {
    const { room } = await database.U({
      location: `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}`,
      data: props.data,
    });
    return { room: room as TChatRoom };
  }

  /**
   * DBoardChatRoom API
   * @description 보드 주제방 비활성
   */
  async function DBoardChatRoom(props: {
    params: { boardId: string; roomId: string };
  }) {
    return await database.D({
      location: `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}`,
    });
  }

  /**
   * RBoardChatMessages API
   * @description 보드 채팅 메시지 목록 조회
   */
  async function RBoardChatMessages(props: {
    params: { boardId: string; roomId: string };
    query?: { limit?: number; before?: string };
  }) {
    const { messages } = await database.R({
      location:
        `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}/messages` +
        QUERY_BUILDER(props.query),
    });
    return { messages: messages as TChatMessage[] };
  }

  /**
   * CBoardChatMessage API
   * @description 보드 채팅 메시지 전송
   */
  async function CBoardChatMessage(props: {
    params: { boardId: string; roomId: string };
    data: {
      content: string;
      messageType?: "text" | "image" | "file";
      attachment?: {
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        key?: string;
      };
    };
  }) {
    const { message } = await database.C({
      location: `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}/messages`,
      data: props.data,
    });
    return { message: message as TChatMessage };
  }

  /**
   * DBoardChatMessage API
   * @description 보드 채팅 메시지 삭제 API
   */
  async function DBoardChatMessage(props: {
    params: { boardId: string; roomId: string; messageId: string };
  }) {
    return await database.D({
      location: `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}/messages/${props.params.messageId}`,
    });
  }

  /**
   * UBoardChatRead API
   * @description 보드 채팅 읽음 처리
   */
  async function UBoardChatRead(props: {
    params: { boardId: string; roomId: string };
  }) {
    return await database.U({
      location: `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}/read`,
      data: {},
    });
  }

  /**
   * CBoardChatFileUpload API
   * @description 보드 채팅 파일 업로드
   */
  async function CBoardChatFileUpload(props: {
    params: { boardId: string; roomId: string };
    data: FormData;
  }) {
    const { attachment } = await database.C({
      location: `boards/${props.params.boardId}/chat/rooms/${props.params.roomId}/upload`,
      data: props.data,
    });
    return {
      attachment: attachment as {
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
        key?: string;
      },
    };
  }

  /**
   * ##########################################################################
   * AI Chat API
   * ##########################################################################
   */

  /**
   * RAIChatSettings API
   * @description AI 채팅 설정 조회
   */
  async function RAIChatSettings(props: {
    params: { _id: string };
  }) {
    const { enabled } = await database.R({
      location: `boards/${props.params._id}/ai-chat/settings`,
    });
    return { enabled: enabled as boolean };
  }

  /**
   * RAIChatSessions API
   * @description AI 채팅 세션 목록 조회
   */
  async function RAIChatSessions(props: {
    params: { _id: string };
  }) {
    const { sessions } = await database.R({
      location: `boards/${props.params._id}/ai-chat/sessions`,
    });
    return { sessions: sessions as TAIChatSession[] };
  }

  /**
   * RAIChatMessages API
   * @description AI 채팅 메시지 목록 조회
   */
  async function RAIChatMessages(props: {
    params: { _id: string; sessionId: string };
    query?: { limit?: number; before?: string };
  }) {
    const { messages } = await database.R({
      location:
        `boards/${props.params._id}/ai-chat/sessions/${props.params.sessionId}/messages` +
        QUERY_BUILDER(props.query),
    });
    return { messages: messages as TAIChatMessage[] };
  }

  /**
   * CAIChatMessage API
   * @description AI 채팅 메시지 전송
   */
  async function CAIChatMessage(props: {
    params: { _id: string };
    data: { content: string; sessionId?: string };
  }) {
    const result = await database.C({
      location: `boards/${props.params._id}/ai-chat/messages`,
      data: props.data,
    });
    return result as { messages: TAIChatMessage[] };
  }

  /**
   * ##########################################################################
   * AI API
   * ##########################################################################
   */

  /**
   * GenerateSyllabusContent API
   * @description AI를 사용하여 강의계획서 내용 생성
   * @version 1.0.0
   * @auth user
   */
  async function GenerateSyllabusContent(props: {
    data: {
      season: string;
      context: {
        subject?: string[];
        classTitle?: string;
        point?: number;
        limit?: number;
        currentInfo?: any;
        formSyllabus?: any;
      };
      enrollments?: {
        role: "teacher" | "student" | undefined;
        userId: string;
        userName: string;
      }[];
    };
  }) {
    const { content } = await database.C({
      location: `ai/syllabus/generate`,
      data: props.data,
    });
    return { content: content as any };
  }

  /**
   * TestAiApiKey API
   * @description AI API 키 테스트
   * @version 1.0.0
   * @auth owner
   */
  async function TestAiApiKey(props: {
    data: {
      apiKey: string;
      aiModel?: string;
    };
  }) {
    const { valid, error } = await database.C({
      location: `ai/test`,
      data: props.data,
    });
    return { valid: valid as boolean, error: error as string | undefined };
  }

  /**
   * ListAiModels API
   * @description 사용 가능한 AI 모델 목록 조회
   * @version 1.0.0
   * @auth owner
   */
  async function ListAiModels(props: {
    data: {
      apiKey?: string;
      academyId?: string;
    };
  }) {
    const { models, error } = await database.C({
      location: `ai/models`,
      data: props.data,
    });
    return {
      models: models as { name: string; displayName: string }[],
      error: error as string | undefined,
    };
  }

  /**
   * CReminder API
   * @description 리마인더 생성 API
   */
  async function CReminder(props: {
    data: {
      title: string;
      memo?: string;
      reminderTime: string;
    };
  }) {
    const { reminder } = await database.C({
      location: "reminders",
      data: props.data,
    });
    return { reminder };
  }

  /**
   * RUpcomingReminders API
   * @description 다가오는 리마인더 조회 (24시간 이내)
   */
  async function RUpcomingReminders() {
    const { reminders } = await database.R({
      location: "reminders/upcoming",
    });
    return { reminders: reminders as any[] };
  }

  /**
   * UReminder API
   * @description 리마인더 수정 API
   */
  async function UReminder(props: {
    params: { _id: string };
    data: {
      title?: string;
      memo?: string;
      reminderTime?: string;
    };
  }) {
    const { reminder } = await database.U({
      location: `reminders/${props.params._id}`,
      data: props.data,
    });
    return { reminder };
  }

  /**
   * UCompleteReminder API
   * @description 리마인더 완료 처리 API
   */
  async function UCompleteReminder(props: { params: { _id: string } }) {
    const { reminder } = await database.U({
      location: `reminders/${props.params._id}/complete`,
      data: {},
    });
    return { reminder };
  }

  /**
   * DReminder API
   * @description 리마인더 삭제 API
   */
  async function DReminder(props: { params: { _id: string } }) {
    return await database.D({
      location: `reminders/${props.params._id}`,
    });
  }

  /**
   * ##########################################################################
   * Alt Form API
   * ##########################################################################
   */

  async function CAltForm(props: {
    data: {
      board: string;
      title: string;
      description?: string;
      fields?: TAltFormField[];
      rubrics?: TAltForm["rubrics"];
      settings?: Partial<TAltFormSettings>;
      isDraft?: boolean;
    };
  }) {
    const { form, sheet } = await database.C({
      location: "alt-forms",
      data: props.data,
    });
    return { form: form as TAltForm, sheet: sheet as TAltSheet };
  }

  async function RAltForms(props: { query: { board: string } }) {
    const { forms } = await database.R({
      location: "alt-forms" + QUERY_BUILDER(props.query),
    });
    return { forms: forms as TAltForm[] };
  }

  async function RAltForm(props: { params: { _id: string } }) {
    const { form } = await database.R({
      location: `alt-forms/${props.params._id}`,
    });
    return { form: form as TAltForm };
  }

  async function UAltForm(props: {
    params: { _id: string };
    data: {
      title?: string;
      description?: string;
      fields?: TAltFormField[];
      rubrics?: TAltForm["rubrics"];
      settings?: Partial<TAltFormSettings>;
      isDraft?: boolean;
    };
  }) {
    const { form } = await database.U({
      location: `alt-forms/${props.params._id}`,
      data: props.data,
    });
    return { form: form as TAltForm };
  }

  async function DAltForm(props: { params: { _id: string } }) {
    return await database.D({
      location: `alt-forms/${props.params._id}`,
    });
  }

  async function ExportAltForm(props: { params: { _id: string } }) {
    const { formData } = await database.R({
      location: `alt-forms/${props.params._id}/export`,
    });
    return { formData };
  }

  async function ImportAltForm(props: {
    data: { board: string; formData: any };
  }) {
    const { form, sheet } = await database.C({
      location: "alt-forms/import",
      data: props.data,
    });
    return { form: form as TAltForm, sheet: sheet as TAltSheet };
  }

  async function DuplicateAltForm(props: { params: { _id: string } }) {
    const { form, sheet } = await database.C({
      location: `alt-forms/${props.params._id}/duplicate`,
      data: {},
    });
    return { form: form as TAltForm, sheet: sheet as TAltSheet };
  }

  /**
   * ##########################################################################
   * Alt Sheet Row API
   * ##########################################################################
   */

  async function CAltSheetRow(props: {
    data: {
      form: string;
      data: Record<string, any>;
    };
  }) {
    const { row } = await database.C({
      location: "alt-sheet-rows",
      data: props.data,
    });
    return { row: row as TAltSheetRow };
  }

  async function RAltSheetRow(props: { params: { _id: string } }) {
    const { row, boardId, formId, formTitle } = await database.R({
      location: `alt-sheet-rows/${props.params._id}`,
    });
    return {
      row: row as TAltSheetRow,
      boardId: boardId as string,
      formId: formId as string | undefined,
      formTitle: formTitle as string | undefined,
    };
  }

  async function RAltSheetRows(props: { query: { form: string } }) {
    const { rows } = await database.R({
      location: "alt-sheet-rows" + QUERY_BUILDER(props.query),
    });
    return { rows: rows as TAltSheetRow[] };
  }

  async function RAltSheetRowMy(props: { query: { form: string } }) {
    const { rows } = await database.R({
      location: "alt-sheet-rows/my" + QUERY_BUILDER(props.query),
    });
    return { rows: (rows || []) as TAltSheetRow[] };
  }

  async function UAltSheetRow(props: {
    params: { _id: string };
    data: { data: Record<string, any> };
  }) {
    const { row } = await database.U({
      location: `alt-sheet-rows/${props.params._id}`,
      data: props.data,
    });
    return { row: row as TAltSheetRow };
  }

  async function UAltSheetRowAssessment(props: {
    params: { _id: string };
    data: {
      byField?: Record<
        string,
        {
          score?: number | null;
          levelId?: string | null;
          comment?: string | null;
          byRubric?: Record<
            string,
            { levelId?: string | null; comment?: string | null }
          >;
        }
      >;
      final?: {
        comment?: string | null;
      };
      finalize?: boolean;
      unfinalize?: boolean;
    };
  }) {
    const { row, assessment } = await database.U({
      location: `alt-sheet-rows/${props.params._id}/assessment`,
      data: props.data,
    });
    return { row: row as TAltSheetRow, assessment };
  }

  async function DAltSheetRow(props: { params: { _id: string } }) {
    return await database.D({
      location: `alt-sheet-rows/${props.params._id}`,
    });
  }

  async function CAltSheetRowsBulk(props: {
    data: {
      form: string;
      rows: {
        _respondent?: string;
        _respondentId?: string;
        _respondentName?: string;
        data: Record<string, any>;
      }[];
    };
  }) {
    const { rows, created } = await database.C({
      location: "alt-sheet-rows/bulk",
      data: props.data,
    });
    return { rows: rows as TAltSheetRow[], created: created as number };
  }

  async function RAltSheetRowSubmissionStatus(props: {
    query: { form: string };
  }) {
    return await database.R({
      location:
        "alt-sheet-rows/submission-status" + QUERY_BUILDER(props.query),
    });
  }

  async function CAltSheetRowSendReminder(props: {
    data: { form: string; userIds: string[] };
  }) {
    return await database.C({
      location: "alt-sheet-rows/send-reminder",
      data: props.data,
    });
  }

  async function RAltSheetRowCount(props: { query: { form: string } }) {
    const { count } = await database.R({
      location: "alt-sheet-rows/count" + QUERY_BUILDER(props.query),
    });
    return { count: count as number };
  }

  async function RAltSheetRowAvailableCombinations(props: {
    query: { form: string; filters?: Record<string, any> };
  }) {
    const { combinations } = await database.R({
      location:
        "alt-sheet-rows/available-combinations" +
        QUERY_BUILDER(props.query),
    });
    return { combinations };
  }

  async function CAltSheetRowImportCsv(props: {
    data: { form: string; rows: Record<string, any>[] };
  }) {
    const { rows, created } = await database.C({
      location: "alt-sheet-rows/import-csv",
      data: props.data,
    });
    return { rows: rows as TAltSheetRow[], created: created as number };
  }

  async function RAltSheetRowPendingApprovals(props: {
    query: { board: string };
  }) {
    const { items, outgoing, count } = await database.R({
      location:
        "alt-sheet-rows/pending-approvals" + QUERY_BUILDER(props.query),
    });
    type PendingApprovalItem = {
      rowId: string;
      formId: string;
      formTitle: string;
      fieldId: string;
      fieldLabel: string;
      stepLabel?: string;
      respondentName?: string;
      respondentId?: string;
      currentApproverName?: string;
      currentApproverId?: string;
      currentStep?: number;
      totalSteps?: number;
      submittedAt?: string;
      approval?: any;
      rowData?: Record<string, any>;
      fields?: TAltFormField[];
    };
    return {
      items: (items || []) as PendingApprovalItem[],
      outgoing: (outgoing || []) as PendingApprovalItem[],
      count: (count as number) || 0,
    };
  }

  async function RAltSheetRowSchoolTodos(props: {
    query: { school: string; season?: string };
  }) {
    const { items, count } = await database.R({
      location: "alt-sheet-rows/school-todos" + QUERY_BUILDER(props.query),
    });
    return {
      items: (items || []) as {
        kind: "approve" | "outgoing" | "unsubmitted";
        boardId: string;
        boardTitle: string;
        formId: string;
        formTitle: string;
        rowId?: string;
        fieldId?: string;
        fieldLabel?: string;
        stepLabel?: string;
        respondentName?: string;
        respondentId?: string;
        currentApproverName?: string;
        currentApproverId?: string;
        currentStep?: number;
        totalSteps?: number;
        progress?: string;
        myResponseCount?: number;
        requiredResponseCount?: number | null;
        submittedAt?: string;
      }[],
      count: (count as number) || 0,
    };
  }

  return {
    AcademyAPI: {
      CAcademy,
      RAcademy,
      RAcademies,
      UAcademyEmail,
      UAcademyTel,
      UAcademyChatEnabled,
      UAcademyBoardEnabled,
      UAcademyAiEnabled,
      UAcademyAiApiKey,
      RAcademyAiApiKey,
      UAcademyAiModel,
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
      UUserPassword,
      UUserEmail,
      UUserTel,
      UUserName,
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
      RSchoolDashboard,
      USchoolFormArchive,
      USchoolLinks,
      USchoolFeatureFlags,
      USchoolBoardCreationPermission,
      USchoolBoardNotificationEvents,
      RestoreFormArchive,
      RemoveFormArchive,
      DSchool,
    },
    CalendarEventAPI: {
      CCalendarEvent,
      RCalendarEvents,
      UCalendarEvent,
      DCalendarEvent,
      SyncCalendarEvents,
    },
    UserCalendarAPI: {
      CUserCalendar,
      RUserCalendars,
      UUserCalendar,
      DUserCalendar,
    },
    SeasonAPI: {
      CSeason,
      RSeasons,
      RSeason,
      RSeasonFormUsage,
      UActivateSeason,
      UInactivateSeason,
      USeasonBasic,
      USeasonPeriod,
      USeasonClassrooms,
      USeasonSubjects,
      USeasonFormTimetable,
      USeasonFormSyllabus,
      USeasonFormEvaluation,
      USeasonAiSettings,
      CSeasonAiReferenceUpload,
      RSeasonAiReferenceDownload,
      DSeasonAiReference,
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
      USyllabusCoverImage,
      DSyllabusCoverImage,
      DSyllabus,
      CSyllabusAltBoard,
      RSyllabusAltBoard,
      USyllabusAltBoardSync,
      LinkSyllabusAltBoard,
      ImportEvaluationFromBoard,
      ImportEvaluationFromCsv,
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
      UFormPermission,
      CFormPermissionException,
      DFormPermissionException,
    },
    FileAPI: {
      CUploadFileArchive,
      RSignedUrlArchive,
      RSignedUrlDocument,
      RSignedUrlBackup,
    },
    NotificationAPI: {
      RNotifications,
      RNotification,
      UCheckNotification,
      DNotification,
      RNotificationSettings,
      UNotificationSettings,
      UBulkCheckNotifications,
    },
    ReminderAPI: {
      CReminder,
      RUpcomingReminders,
      UReminder,
      UCompleteReminder,
      DReminder,
    },
    CalendarSettingAPI: {
      RCalendarSettings,
      UCalendarSettings,
    },
    ThemeSettingsAPI: {
      RThemeSettings,
      UThemeSettings,
    },
    BoardAPI: {
      CBoard,
      DuplicateBoard,
      RBoards,
      RBoard,
      UBoard,
      CBoardMemberUser,
      DBoardMemberUser,
      CBoardWriterUser,
      DBoardWriterUser,
      DBoardLeave,
      RBoardMemberList,
      DBoard,
      UBoardCoverImage,
      DBoardCoverImage,
    },
    BoardFavoriteAPI: {
      RBoardFavorites,
      CBoardFavorite,
      DBoardFavoriteByBoard,
    },
    PostAPI: {
      CPost,
      RPosts,
      RPostUnreadCount,
      RPost,
      UPost,
      UPostPin,
      RPostReaders,
      DPost,
      CUploadPostFile,
      RSignedUrlPostFile,
      RPostOgMeta,
      DuplicatePost,
      SearchPosts,
    },
    SurveyResponseAPI: {
      CSurveyResponse,
      RSurveyResponseMy,
      RSurveyResponses,
      RSurveyStats,
      USurveyResponse,
      ExportSurveyJSON,
      CSurveyFileUpload,
      RSurveyFileSignedUrl,
    },
    CommentAPI: {
      CComment,
      RComments,
      RCommentCounts,
      UComment,
      DComment,
    },
    ChatAPI: {
      RChatRooms,
      RChatRoom,
      CChatRoom,
      UChatRoom,
      DChatRoom,
      CChatRoomParticipants,
      DChatRoomParticipant,
      RChatMessages,
      CChatMessage,
      DChatMessage,
      UChatRoomRead,
      UChatRoomPin,
      UChatRoomArchive,
      RChatUsers,
      CChatFileUpload,
      RChatFiles,
      DChatFile,
      RChatFileSignedUrl,
    },
    BoardChatAPI: {
      RBoardChatRoom,
      RBoardChatRooms,
      CBoardChatRoom,
      UBoardChatRoom,
      DBoardChatRoom,
      CBoardChatRoomParticipants,
      DBoardChatRoomParticipant,
      RBoardChatMessages,
      CBoardChatMessage,
      DBoardChatMessage,
      UBoardChatRead,
      CBoardChatFileUpload,
    },
    AIChatAPI: {
      RAIChatSettings,
      RAIChatSessions,
      RAIChatMessages,
      CAIChatMessage,
    },
    AIAPI: {
      GenerateSyllabusContent,
      TestAiApiKey,
      ListAiModels,
    },

    AltFormAPI: {
      CAltForm,
      RAltForms,
      RAltForm,
      UAltForm,
      DAltForm,
      ExportAltForm,
      ImportAltForm,
      DuplicateAltForm,
    },
    AltSheetRowAPI: {
      CAltSheetRow,
      RAltSheetRow,
      RAltSheetRows,
      RAltSheetRowMy,
      UAltSheetRow,
      UAltSheetRowAssessment,
      DAltSheetRow,
      CAltSheetRowsBulk,
      RAltSheetRowSubmissionStatus,
      CAltSheetRowSendReminder,
      RAltSheetRowCount,
      RAltSheetRowAvailableCombinations,
      CAltSheetRowImportCsv,
      RAltSheetRowPendingApprovals,
      RAltSheetRowSchoolTodos,
    },
  };
}
