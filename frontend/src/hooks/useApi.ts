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
   * Registration Api
   * ##########################################################################
   */

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
    const result = await database.C({ location: "forms", data });
    return result;
  }

  /**
   * Copy Form
   * @type POST
   * @auth admin
   * @returns Created Form
   */
  async function CopyForm(data: { copyFrom: string }) {
    const result = await database.C({ location: "forms", data });
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
    type?: "syllabus" | "timetable" | "evaluation" | "archive" | "print";
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
   * Enrollment Api
   * ##########################################################################
   */

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
   * Hide Enrollment from calendar
   * @type PUT
   * @auth member
   */
  async function UHideEnrollmentFromCalendar(props: { _id: string }) {
    return await database.U({
      location: "enrollments/" + props._id + "/hide",
      data: {},
    });
  }

  /**
   * Show Enrollment from calendar
   * @type PUT
   * @auth member
   */
  async function UShowEnrollmentFromCalendar(props: { _id: string }) {
    return await database.U({
      location: "enrollments/" + props._id + "/show",
      data: {},
    });
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
    return _.orderBy(enrollments, ["createdAt"], ["asc"]);
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
   * Read Archive by registration
   * @type GET
   * @auth admin
   * @returns Archives
   */
  async function RArchiveByRegistration(params: {
    registrationId: string;
    label?: string;
  }) {
    const { archive } = await database.R({
      location: "archives" + QUERY_BUILDER(params),
    });
    return archive;
  }

  /**
   * Update Archive by registration
   * @type PUT
   * @auth admin
   * @returns Archive
   */
  async function UArchiveByRegistration(params: {
    _id: string;
    label: string;
    data: object;
    registration: string;
  }) {
    const { archive } = await database.U({
      location: `archives/${params._id}`,
      data: {
        label: params.label,
        data: params.data,
        registration: params.registration,
      },
    });
    return archive;
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
    const { notifications: _notifications } = await database.R({
      location: "notifications" + QUERY_BUILDER(props),
    });
    const notifications = _.sortBy(_notifications, "createdAt").reverse();
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
  async function RDocumentData(params: { school: string }) {
    return await database.R({
      location: `documents/data` + QUERY_BUILDER(params),
    });
  }

  /**
   * File Api
   * ##########################################################################
   */
  async function SignFile(props: { key: string; fileName: string }) {
    return await database.R({
      location: "files/signed" + QUERY_BUILDER(props),
    });
  }
  async function SignFileArchive(props: {
    key: string;
    fileName: string;
    archive: string;
    label: string;
    fieldLabel: string;
  }) {
    return await database.R({
      location: "files/signed" + QUERY_BUILDER(props),
    });
  }

  async function UploadFileArchive(props: { data: FormData }) {
    return await database.C({
      location: "files/archive",
      data: props.data,
    });
  }

  /**
   * Backup Api
   * ##########################################################################
   */
  async function CBackup(props: { academyId: string; models: string[] }) {
    return await database.C({
      location: "files/backup" + QUERY_BUILDER({ academyId: props.academyId }),
      data: { models: props.models },
    });
  }

  async function RBackupList(props: { academyId: string }) {
    const { list } = await database.R({
      location: "files/backup" + QUERY_BUILDER(props),
    });
    return list;
  }
  async function RBackup(props: { academyId: string; title: string }) {
    const { list } = await database.R({
      location: "files/backup" + QUERY_BUILDER(props),
    });
    return list;
  }
  async function DBackup(props: { academyId: string; title: string }) {
    return await database.D({
      location: "files/backup" + QUERY_BUILDER(props),
    });
  }
  async function RestoreBackup(props: {
    academyId: string;
    model: string;
    documents: any[];
  }) {
    return await database.C({
      location: "files/restore",
      data: props,
    });
  }

  return {
    RegistrationApi: {
      CMemo,
      UMemo,
      DMemo,
    },
    EnrollmentApi: {
      REnrolllment,
      DEnrollment,
      DEnrollments,
      REnrollmentWithEvaluations,
      UEvaluation,
      UEnrollmentMemo,
      UHideEnrollmentFromCalendar,
      UShowEnrollmentFromCalendar,
    },
    FormApi: {
      CForm,
      CopyForm,
      RForms,
      RForm,
    },
    ArchiveApi: {
      RArchiveByRegistration,
      UArchiveByRegistration,
    },
    NotificationApi: {
      SendNotifications,
      RNotifications,
      RNotificationById,
      UCheckNotification,
      DNotifications,
    },
    DocumentApi: {
      RDocumentData,
    },
    FileApi: {
      SignFile,
      SignFileArchive,
      UploadFileArchive,
    },
    BackupApi: {
      CBackup,
      RBackupList,
      RBackup,
      DBackup,
      RestoreBackup,
    },
  };
}
