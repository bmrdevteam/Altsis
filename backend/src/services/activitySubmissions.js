import { ActivitySubmission, AltSheetRow, Enrollment } from "../models/index.js";
import { FIELD_INVALID, FIELD_REQUIRED, __NOT_FOUND } from "../messages/index.js";

const createHttpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const toObjectIdString = (value) =>
  value?.toString?.() || (typeof value === "string" ? value : "");

const resolveNextSubmissionStatus = (existingStatus, hasRow) => {
  if (!hasRow) return "not_started";
  if (existingStatus === "completed" || existingStatus === "returned") {
    return existingStatus;
  }
  return "submitted";
};

const upsertSubmission = async ({
  academyId,
  activity,
  enrollment,
  row,
  existing,
}) => {
  const hasRow = !!row;
  const nextStatus = resolveNextSubmissionStatus(existing?.status, hasRow);
  const nextSubmittedAt = row?._submittedAt || existing?.submittedAt;

  let resubmitCount = existing?.resubmitCount || 0;
  if (
    hasRow &&
    existing?.submittedAt &&
    nextSubmittedAt &&
    new Date(nextSubmittedAt).getTime() !== new Date(existing.submittedAt).getTime()
  ) {
    resubmitCount += 1;
  }

  const update = {
    activity: activity._id,
    syllabus: activity.syllabus,
    season: activity.season,
    school: activity.school,
    enrollment: enrollment._id,
    student: enrollment.student,
    studentId: enrollment.studentId,
    studentName: enrollment.studentName,
    altSheetRow: row?._id,
    status: nextStatus,
    submittedAt: nextSubmittedAt,
    resubmitCount,
    isActive: true,
  };

  const submission = await ActivitySubmission(academyId).findOneAndUpdate(
    { activity: activity._id, enrollment: enrollment._id },
    {
      $set: update,
      ...(existing ? {} : { $setOnInsert: { feedback: [] } }),
    },
    { upsert: true, new: true }
  );

  return submission;
};

const getLatestRowMap = (rows) => {
  const map = new Map();
  for (const row of rows) {
    const key = toObjectIdString(row._respondent);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return map;
};

export const syncActivitySubmissions = async (academyId, activity) => {
  const [enrollments, rows, existingSubmissions] = await Promise.all([
    Enrollment(academyId)
      .find({ syllabus: activity.syllabus })
      .select("_id student studentId studentName"),
    activity.altForm
      ? AltSheetRow(academyId)
          .find({
            form: activity.altForm,
            isActive: true,
            _respondent: { $ne: null },
          })
          .sort({ _updatedAt: -1, createdAt: -1 })
          .lean()
      : [],
    ActivitySubmission(academyId).find({ activity: activity._id }),
  ]);

  const existingMap = new Map(
    existingSubmissions.map((submission) => [
      toObjectIdString(submission.enrollment),
      submission,
    ])
  );
  const rowMap = getLatestRowMap(rows);
  const syncedSubmissionIds = new Set();
  const submissions = [];

  for (const enrollment of enrollments) {
    const row = rowMap.get(toObjectIdString(enrollment.student));
    const existing = existingMap.get(toObjectIdString(enrollment._id));
    const submission = await upsertSubmission({
      academyId,
      activity,
      enrollment,
      row,
      existing,
    });
    syncedSubmissionIds.add(toObjectIdString(submission._id));
    submissions.push(submission);
  }

  const staleSubmissionIds = existingSubmissions
    .filter(
      (submission) =>
        !syncedSubmissionIds.has(toObjectIdString(submission._id)) &&
        submission.isActive
    )
    .map((submission) => submission._id);

  if (staleSubmissionIds.length > 0) {
    await ActivitySubmission(academyId).updateMany(
      { _id: { $in: staleSubmissionIds } },
      { isActive: false }
    );
  }

  return submissions.sort(
    (a, b) =>
      new Date(b.submittedAt || b.updatedAt).getTime() -
      new Date(a.submittedAt || a.updatedAt).getTime()
  );
};

export const syncMyActivitySubmission = async (academyId, activity, user) => {
  const enrollment = await Enrollment(academyId)
    .findOne({ syllabus: activity.syllabus, student: user._id })
    .select("_id student studentId studentName");

  if (!enrollment) return null;

  const [existing, row] = await Promise.all([
    ActivitySubmission(academyId).findOne({
      activity: activity._id,
      enrollment: enrollment._id,
    }),
    activity.altForm
      ? AltSheetRow(academyId)
          .findOne({
            form: activity.altForm,
            isActive: true,
            _respondent: user._id,
          })
          .sort({ _updatedAt: -1, createdAt: -1 })
          .lean()
      : null,
  ]);

  return upsertSubmission({
    academyId,
    activity,
    enrollment,
    row,
    existing,
  });
};

export const initializeActivitySubmissionsForActivity = async (
  academyId,
  activity
) => {
  return syncActivitySubmissions(academyId, activity);
};

export const findActivitySubmissionOrThrow = async (
  academyId,
  activityId,
  submissionId
) => {
  const submission = await ActivitySubmission(academyId).findOne({
    _id: submissionId,
    activity: activityId,
    isActive: true,
  });
  if (!submission) {
    throw createHttpError(404, __NOT_FOUND("activitySubmission"));
  }
  return submission;
};

export const addActivityFeedback = async ({
  academyId,
  activity,
  submissionId,
  user,
  message,
  status,
}) => {
  if (!message) {
    throw createHttpError(400, FIELD_REQUIRED("message"));
  }

  const submission = await findActivitySubmissionOrThrow(
    academyId,
    activity._id,
    submissionId
  );

  submission.feedback.push({
    author: user._id,
    authorId: user.userId,
    authorName: user.userName,
    message,
    createdAt: new Date(),
  });

  if (status) {
    if (!["submitted", "returned", "completed"].includes(status)) {
      throw createHttpError(400, FIELD_INVALID("status"));
    }
    submission.status = status;
  }

  await submission.save();
  return submission;
};

export const updateActivitySubmissionStatus = async ({
  academyId,
  activity,
  submissionId,
  status,
}) => {
  if (!status) {
    throw createHttpError(400, FIELD_REQUIRED("status"));
  }
  if (!["not_started", "submitted", "returned", "completed"].includes(status)) {
    throw createHttpError(400, FIELD_INVALID("status"));
  }

  const submission = await findActivitySubmissionOrThrow(
    academyId,
    activity._id,
    submissionId
  );
  submission.status = status;
  await submission.save();
  return submission;
};
