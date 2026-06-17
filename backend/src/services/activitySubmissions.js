import {
  Activity,
  ActivitySubmission,
  AltForm,
  AltSheetRow,
  Board,
  Enrollment,
  Registration,
} from "../models/index.js";
import { canRespondForm } from "./altForms.js";

export class ActivitySubmissionService {
  constructor(academyId) {
    this.academyId = academyId;
  }

  getOrCreateSubmission = async (activity, enrollment) => {
    let submission = await ActivitySubmission(this.academyId).findOne({
      activity: activity._id,
      enrollment: enrollment._id,
    });
    if (!submission) {
      submission = await ActivitySubmission(this.academyId).create({
        activity: activity._id,
        enrollment: enrollment._id,
        student: enrollment.student,
        studentId: enrollment.studentId,
        studentName: enrollment.studentName,
        studentGrade: enrollment.grade,
        status: "not_started",
      });
    }
    return submission;
  };

  findStudentEnrollment = async (user, syllabusId) => {
    return Enrollment(this.academyId).findOne({
      syllabus: syllabusId,
      student: user._id,
    });
  };

  checkStudentAccess = async (user, activity) => {
    const enrollment = await this.findStudentEnrollment(user, activity.syllabus);
    if (!enrollment) return { allowed: false };
    const registration = await Registration(this.academyId).findOne({
      user: user._id,
      season: activity.season,
    });
    if (!registration?.permissionActivityV2) {
      return { allowed: false, enrollment };
    }
    return { allowed: true, enrollment, registration };
  };

  submit = async ({ activity, enrollment, data, user }) => {
    if (activity.status !== "published") {
      throw Object.assign(new Error("ACTIVITY_NOT_PUBLISHED"), { status: 403 });
    }

    const form = await AltForm(this.academyId).findById(activity.altForm);
    if (!form || !form.isActive) {
      throw Object.assign(new Error("ALT_FORM_NOT_FOUND"), { status: 404 });
    }

    const board = await Board(this.academyId).findById(form.board);
    const respondCheck = canRespondForm(form, board, user);
    if (!respondCheck.allowed) {
      throw Object.assign(new Error(respondCheck.message), { status: 403 });
    }

    let submission = await this.getOrCreateSubmission(activity, enrollment);

    let altSheetRow = submission.altSheetRow
      ? await AltSheetRow(this.academyId).findById(submission.altSheetRow)
      : null;

    const respondentFields = form.fields.filter(
      (f) => f.permission === "respondent"
    );

    if (altSheetRow) {
      if (
        (submission.status === "submitted" ||
          submission.status === "completed") &&
        !form.settings?.allowResubmit
      ) {
        throw Object.assign(new Error("ACTIVITY_RESUBMIT_NOT_ALLOWED"), {
          status: 403,
        });
      }
      for (const field of respondentFields) {
        const fieldId = field._id.toString();
        if (fieldId in data) {
          altSheetRow.data.set(fieldId, data[fieldId]);
        }
      }
      altSheetRow._updatedAt = new Date();
      if (!altSheetRow._submittedAt) altSheetRow._submittedAt = new Date();
      await altSheetRow.save();
      if (submission.status === "submitted") {
        submission.resubmitCount += 1;
      }
    } else {
      const rowData = new Map();
      for (const field of respondentFields) {
        const fieldId = field._id.toString();
        if (fieldId in data) {
          rowData.set(fieldId, data[fieldId]);
        }
      }
      altSheetRow = await AltSheetRow(this.academyId).create({
        sheet: form.sheet,
        form: form._id,
        board: form.board,
        _respondent: user._id,
        _respondentId: user.userId,
        _respondentName: user.userName,
        data: rowData,
        _submittedAt: new Date(),
        _updatedAt: new Date(),
      });
      submission.altSheetRow = altSheetRow._id;
    }

    submission.status = "submitted";
    submission.submittedAt = new Date();
    await submission.save();

    return { submission, altSheetRow, form };
  };

  saveDraft = async ({ activity, enrollment, data, user }) => {
    const form = await AltForm(this.academyId).findById(activity.altForm);
    if (!form) {
      throw Object.assign(new Error("ALT_FORM_NOT_FOUND"), { status: 404 });
    }

    let submission = await this.getOrCreateSubmission(activity, enrollment);
    let altSheetRow = submission.altSheetRow
      ? await AltSheetRow(this.academyId).findById(submission.altSheetRow)
      : null;

    const respondentFields = form.fields.filter(
      (f) => f.permission === "respondent"
    );

    if (altSheetRow) {
      for (const field of respondentFields) {
        const fieldId = field._id.toString();
        if (fieldId in data) {
          altSheetRow.data.set(fieldId, data[fieldId]);
        }
      }
      altSheetRow._updatedAt = new Date();
      await altSheetRow.save();
    } else {
      const rowData = new Map();
      for (const field of respondentFields) {
        const fieldId = field._id.toString();
        if (fieldId in data) {
          rowData.set(fieldId, data[fieldId]);
        }
      }
      altSheetRow = await AltSheetRow(this.academyId).create({
        sheet: form.sheet,
        form: form._id,
        board: form.board,
        _respondent: user._id,
        _respondentId: user.userId,
        _respondentName: user.userName,
        data: rowData,
        _updatedAt: new Date(),
      });
      submission.altSheetRow = altSheetRow._id;
    }

    if (submission.status === "not_started") {
      submission.status = "in_progress";
    }
    await submission.save();
    return { submission, altSheetRow, form };
  };

  addFeedback = async ({ submission, content, user }) => {
    submission.feedback.push({
      user: user._id,
      userId: user.userId,
      userName: user.userName,
      content,
      createdAt: new Date(),
    });
    submission.status = "returned";
    await submission.save();
    return submission;
  };

  complete = async (submission) => {
    submission.status = "completed";
    await submission.save();
    return submission;
  };

  serializeRowData = (row) => {
    if (!row?.data) return {};
    if (row.data instanceof Map) {
      return Object.fromEntries(row.data);
    }
    return row.data;
  };
}
