import crypto from "crypto";
import {
  Activity,
  ActivityTemplate,
  AltForm,
  AltSheet,
  Board,
  CalendarEvent,
  Enrollment,
  Registration,
} from "../models/index.js";
import { syncBoardChatParticipants } from "./boardChat.js";
import { FIELD_INVALID, PERMISSION_DENIED, __NOT_FOUND } from "../messages/index.js";

export const ACTIVITY_TYPE_VALUES = ["assignment", "quiz", "discussion"];
export const ACTIVITY_STATUS_VALUES = ["draft", "published", "closed"];
export const ACTIVITY_EVALUATION_MODE_VALUES = ["none", "feedback", "formal"];

const SCOPE_ORDER = {
  builtin: 0,
  school: 1,
  personal: 2,
};

const createHttpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const resolveEnumValueOrThrow = ({ value, fallback, allowedValues, fieldName }) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (allowedValues.includes(value)) {
    return value;
  }
  throw createHttpError(400, FIELD_INVALID(fieldName));
};

export const resolveActivityTypeOrThrow = (value, fallback = "assignment") => {
  return resolveEnumValueOrThrow({
    value,
    fallback,
    allowedValues: ACTIVITY_TYPE_VALUES,
    fieldName: "type",
  });
};

export const resolveActivityStatusOrThrow = (value, fallback = "draft") => {
  return resolveEnumValueOrThrow({
    value,
    fallback,
    allowedValues: ACTIVITY_STATUS_VALUES,
    fieldName: "status",
  });
};

export const resolveActivityEvaluationModeOrThrow = (
  value,
  fallback = "feedback"
) => {
  return resolveEnumValueOrThrow({
    value,
    fallback,
    allowedValues: ACTIVITY_EVALUATION_MODE_VALUES,
    fieldName: "evaluationMode",
  });
};

const toObjectIdString = (value) =>
  value?.toString?.() || (typeof value === "string" ? value : "");

const deepClone = (value) => {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
};

const cloneAltFormField = (field, regenerateId = false) => {
  const cloned = deepClone(field) || {};
  cloned._id = regenerateId
    ? crypto.randomUUID()
    : cloned._id || crypto.randomUUID();
  cloned.label = cloned.label || "항목";
  cloned.type = cloned.type || "text";
  cloned.permission = cloned.permission || "respondent";
  cloned.visibleToRespondent = !!cloned.visibleToRespondent;
  cloned.required = !!cloned.required;
  if (!Array.isArray(cloned.options)) cloned.options = [];
  return cloned;
};

const normalizePreset = (preset = {}) => {
  const normalized = deepClone(preset) || {};
  normalized.content = normalized.content || "";
  normalized.attachments = Array.isArray(normalized.attachments)
    ? normalized.attachments
    : [];
  normalized.altFormSchema = normalized.altFormSchema || {};
  normalized.altFormSchema.fields = Array.isArray(
    normalized.altFormSchema.fields
  )
    ? normalized.altFormSchema.fields
    : [];
  normalized.altFormSchema.settings = normalized.altFormSchema.settings || {};
  normalized.rubric = Array.isArray(normalized.rubric) ? normalized.rubric : [];
  return normalized;
};

export const cloneTemplatePreset = (preset = {}, regenerateFieldIds = false) => {
  const cloned = normalizePreset(preset);
  cloned.altFormSchema.fields = cloned.altFormSchema.fields.map((field) =>
    cloneAltFormField(field, regenerateFieldIds)
  );
  return cloned;
};

export const ACTIVITY_BUILTIN_TEMPLATE_DEFINITIONS = [
  {
    builtinKey: "assignment",
    name: "과제",
    type: "assignment",
    preset: {
      content: "과제 안내를 입력하세요.",
      altFormSchema: {
        fields: [
          {
            _id: "assignment_answer",
            label: "과제 제출 내용",
            type: "textarea",
            permission: "respondent",
            required: true,
            order: 0,
          },
          {
            _id: "assignment_link",
            label: "참고 링크",
            type: "link",
            permission: "respondent",
            required: false,
            order: 1,
          },
          {
            _id: "assignment_feedback",
            label: "교사 피드백",
            type: "textarea",
            permission: "owner",
            visibleToRespondent: true,
            required: false,
            order: 2,
          },
        ],
        settings: {
          allowResubmit: true,
          showOwnResponse: true,
          showOwnerFields: false,
          shareResponses: false,
        },
      },
      rubric: [],
    },
  },
  {
    builtinKey: "quiz",
    name: "퀴즈",
    type: "quiz",
    preset: {
      content: "퀴즈 문항을 작성하고 제출을 안내하세요.",
      altFormSchema: {
        fields: [
          {
            _id: "quiz_answer",
            label: "답안",
            type: "textarea",
            permission: "respondent",
            required: true,
            order: 0,
          },
          {
            _id: "quiz_feedback",
            label: "교사 피드백",
            type: "textarea",
            permission: "owner",
            visibleToRespondent: true,
            required: false,
            order: 1,
          },
        ],
        settings: {
          allowResubmit: true,
          showOwnResponse: true,
          showOwnerFields: false,
          shareResponses: false,
        },
      },
      rubric: [],
    },
  },
  {
    builtinKey: "discussion",
    name: "토론",
    type: "discussion",
    preset: {
      content: "토론 주제와 참여 방법을 입력하세요.",
      altFormSchema: {
        fields: [
          {
            _id: "discussion_opinion",
            label: "토론 의견",
            type: "textarea",
            permission: "respondent",
            required: true,
            order: 0,
          },
          {
            _id: "discussion_feedback",
            label: "교사 피드백",
            type: "textarea",
            permission: "owner",
            visibleToRespondent: true,
            required: false,
            order: 1,
          },
        ],
        settings: {
          allowResubmit: true,
          showOwnResponse: true,
          showOwnerFields: false,
          shareResponses: true,
        },
      },
      rubric: [],
    },
  },
];

export const buildDefaultTemplatePreset = (type = "assignment") => {
  const matched =
    ACTIVITY_BUILTIN_TEMPLATE_DEFINITIONS.find(
      (template) => template.type === type
    ) || ACTIVITY_BUILTIN_TEMPLATE_DEFINITIONS[0];
  return cloneTemplatePreset(matched.preset, false);
};

export const ensureBuiltinActivityTemplates = async (academyId) => {
  const templates = [];
  for (const builtin of ACTIVITY_BUILTIN_TEMPLATE_DEFINITIONS) {
    const template = await ActivityTemplate(academyId).findOneAndUpdate(
      {
        scope: "builtin",
        builtinKey: builtin.builtinKey,
      },
      {
        $set: {
          name: builtin.name,
          type: builtin.type,
          preset: normalizePreset(builtin.preset),
          isEditable: false,
          isActive: true,
          scope: "builtin",
          builtinKey: builtin.builtinKey,
        },
      },
      { upsert: true, new: true }
    );
    templates.push(template);
  }
  return templates;
};

export const canReadActivityTemplate = (template, user, school) => {
  if (!template?.isActive) return false;
  if (template.scope === "builtin") return true;
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (template.scope === "personal") {
    return toObjectIdString(template.creator) === toObjectIdString(user._id);
  }
  if (template.scope === "school") {
    if (!school) return false;
    return toObjectIdString(template.school) === toObjectIdString(school);
  }
  return false;
};

export const canEditActivityTemplate = (template, user) => {
  if (!template?.isActive || !template.isEditable) return false;
  if (template.scope === "builtin") return false;
  if (user.auth === "admin" || user.auth === "manager") return true;
  return toObjectIdString(template.creator) === toObjectIdString(user._id);
};

export const listVisibleActivityTemplates = async ({
  academyId,
  user,
  school,
  type,
  scope,
}) => {
  await ensureBuiltinActivityTemplates(academyId);

  const query = { isActive: true };
  if (type) {
    query.type = type;
  }

  if (scope) {
    if (scope === "builtin") {
      query.scope = "builtin";
    } else if (scope === "personal") {
      query.scope = "personal";
      query.creator = user._id;
    } else if (scope === "school") {
      query.scope = "school";
      query.school = school;
    }
  } else {
    query.$or = [
      { scope: "builtin" },
      { scope: "personal", creator: user._id },
      ...(school ? [{ scope: "school", school }] : []),
    ];
  }

  const templates = await ActivityTemplate(academyId)
    .find(query)
    .sort({ createdAt: -1 });

  return templates.sort((a, b) => {
    const scopeGap =
      (SCOPE_ORDER[a.scope] ?? Number.MAX_SAFE_INTEGER) -
      (SCOPE_ORDER[b.scope] ?? Number.MAX_SAFE_INTEGER);
    if (scopeGap !== 0) return scopeGap;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

const isSyllabusMentor = (syllabus, user) => {
  if (toObjectIdString(syllabus.user) === toObjectIdString(user._id)) return true;
  if (!Array.isArray(syllabus.teachers)) return false;
  return syllabus.teachers.some(
    (teacher) => toObjectIdString(teacher._id) === toObjectIdString(user._id)
  );
};

export const assertActivityAccessPermission = async (
  academyId,
  syllabus,
  user,
  { manageOnly = false } = {}
) => {
  if (user.auth === "admin" || user.auth === "manager") {
    return { registration: null, isMentor: true, isEnrolled: true };
  }

  const registration = await Registration(academyId).findOne({
    season: syllabus.season,
    user: user._id,
  });
  if (!registration) {
    throw createHttpError(404, __NOT_FOUND("registration"));
  }
  if (!registration.permissionActivityV2) {
    throw createHttpError(403, PERMISSION_DENIED);
  }

  const isMentor = isSyllabusMentor(syllabus, user);
  if (manageOnly && !isMentor) {
    throw createHttpError(403, PERMISSION_DENIED);
  }

  if (isMentor) {
    return { registration, isMentor: true, isEnrolled: false };
  }

  const enrollment = await Enrollment(academyId).findOne({
    syllabus: syllabus._id,
    student: user._id,
  });
  if (!enrollment) {
    throw createHttpError(403, PERMISSION_DENIED);
  }

  return { registration, isMentor: false, isEnrolled: true, enrollment };
};

const buildBoardSlug = (classTitle = "") => {
  const cleaned = classTitle
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `alt-${cleaned || `class-${Date.now()}`}`;
};

const normalizeBoardRoleMap = (board) => {
  if (board?.altBoardRole instanceof Map) {
    return board.altBoardRole;
  }
  const normalized = new Map(
    board?.altBoardRole ? Object.entries(board.altBoardRole) : []
  );
  board.altBoardRole = normalized;
  board.markModified("altBoardRole");
  return normalized;
};

const syncSyllabusAltBoardMembers = async ({ academyId, syllabus, board }) => {
  if (!board?.isActive) return board;

  const altBoardRole = normalizeBoardRoleMap(board);
  const members = Array.isArray(board.members?.users) ? board.members.users : [];
  const writers = Array.isArray(board.writers?.users) ? board.writers.users : [];

  const memberSet = new Set(
    members
      .map((member) => toObjectIdString(member?.user))
      .filter((memberId) => !!memberId)
  );
  const writerSet = new Set(
    writers
      .map((writer) => toObjectIdString(writer?.user))
      .filter((writerId) => !!writerId)
  );

  let isUpdated = false;
  const addMemberIfNeeded = ({ user, userId, userName }) => {
    const userKey = toObjectIdString(user);
    if (!userKey || memberSet.has(userKey)) return;
    members.push({ user, userId, userName });
    memberSet.add(userKey);
    isUpdated = true;
  };

  const addWriterIfNeeded = ({ user, userId, userName }) => {
    const userKey = toObjectIdString(user);
    if (!userKey || writerSet.has(userKey)) return;
    writers.push({ user, userId, userName });
    writerSet.add(userKey);
    isUpdated = true;
  };

  if (Array.isArray(syllabus.teachers)) {
    for (const teacher of syllabus.teachers) {
      const teacherKey = toObjectIdString(teacher._id);
      if (!teacherKey) continue;
      if (altBoardRole.get(teacherKey) !== "admin") {
        altBoardRole.set(teacherKey, "admin");
        isUpdated = true;
      }
      addMemberIfNeeded({
        user: teacher._id,
        userId: teacher.userId,
        userName: teacher.userName,
      });
      addWriterIfNeeded({
        user: teacher._id,
        userId: teacher.userId,
        userName: teacher.userName,
      });
    }
  }

  const syllabusOwnerKey = toObjectIdString(syllabus.user);
  if (syllabusOwnerKey && altBoardRole.get(syllabusOwnerKey) !== "admin") {
    altBoardRole.set(syllabusOwnerKey, "admin");
    isUpdated = true;
  }
  addMemberIfNeeded({
    user: syllabus.user,
    userId: syllabus.userId,
    userName: syllabus.userName,
  });
  addWriterIfNeeded({
    user: syllabus.user,
    userId: syllabus.userId,
    userName: syllabus.userName,
  });

  const enrollments = await Enrollment(academyId)
    .find({ syllabus: syllabus._id })
    .select("student studentId studentName");
  for (const enrollment of enrollments) {
    const studentKey = toObjectIdString(enrollment.student);
    if (!studentKey) continue;
    if (!altBoardRole.has(studentKey)) {
      altBoardRole.set(studentKey, "respondent");
      isUpdated = true;
    }
    addMemberIfNeeded({
      user: enrollment.student,
      userId: enrollment.studentId,
      userName: enrollment.studentName,
    });
  }

  if (!isUpdated) return board;

  board.members = {
    groups: board.members?.groups || {
      manager: false,
      teacher: false,
      student: false,
    },
    users: members,
  };
  board.writers = {
    groups: board.writers?.groups || {
      manager: false,
      teacher: false,
      student: false,
    },
    users: writers,
  };
  board.markModified("members");
  board.markModified("writers");
  await board.save();
  await syncBoardChatParticipants(academyId, board);
  return board;
};

export const ensureSyllabusAltBoard = async ({ academyId, syllabus, user }) => {
  if (syllabus.altBoard) {
    const existingBoard = await Board(academyId).findById(syllabus.altBoard);
    if (existingBoard && existingBoard.isActive) {
      return syncSyllabusAltBoardMembers({
        academyId,
        syllabus,
        board: existingBoard,
      });
    }
  }

  const altBoardRole = new Map();
  const memberUsers = [];
  const writerUsers = [];
  const knownUsers = new Set();

  if (Array.isArray(syllabus.teachers)) {
    for (const teacher of syllabus.teachers) {
      const teacherKey = toObjectIdString(teacher._id);
      altBoardRole.set(teacherKey, "admin");
      if (!knownUsers.has(teacherKey)) {
        knownUsers.add(teacherKey);
        memberUsers.push({
          user: teacher._id,
          userId: teacher.userId,
          userName: teacher.userName,
        });
        writerUsers.push({
          user: teacher._id,
          userId: teacher.userId,
          userName: teacher.userName,
        });
      }
    }
  }

  const syllabusOwnerKey = toObjectIdString(syllabus.user);
  if (syllabusOwnerKey && !altBoardRole.has(syllabusOwnerKey)) {
    altBoardRole.set(syllabusOwnerKey, "admin");
  }

  const enrollments = await Enrollment(academyId).find({ syllabus: syllabus._id });
  for (const enrollment of enrollments) {
    const studentKey = toObjectIdString(enrollment.student);
    if (!altBoardRole.has(studentKey)) {
      altBoardRole.set(studentKey, "respondent");
    }
    if (!knownUsers.has(studentKey)) {
      knownUsers.add(studentKey);
      memberUsers.push({
        user: enrollment.student,
        userId: enrollment.studentId,
        userName: enrollment.studentName,
      });
    }
  }

  const baseSlug = buildBoardSlug(syllabus.classTitle);
  let slug = baseSlug;
  let suffix = 1;
  while (
    await Board(academyId).findOne({
      school: syllabus.school,
      slug,
    })
  ) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const board = await Board(academyId).create({
    school: syllabus.school,
    schoolId: syllabus.schoolId,
    schoolName: syllabus.schoolName,
    name: syllabus.classTitle,
    slug,
    description: `${syllabus.classTitle} Alt Board`,
    creator: user._id,
    creatorId: user.userId,
    creatorName: user.userName,
    boardMode: "alt",
    boardType: "official",
    syllabus: syllabus._id,
    altBoardRole,
    members: {
      groups: { manager: false, teacher: false, student: false },
      users: memberUsers,
    },
    writers: {
      groups: { manager: false, teacher: false, student: false },
      users: writerUsers,
    },
  });

  syllabus.altBoard = board._id;
  await syllabus.save();
  return board;
};

const ensureFeedbackField = (fields) => {
  const hasFeedbackField = fields.some(
    (field) => field.permission === "owner" && field.visibleToRespondent
  );
  if (hasFeedbackField) return fields;

  return [
    ...fields,
    {
      _id: crypto.randomUUID(),
      label: "교사 피드백",
      type: "textarea",
      permission: "owner",
      visibleToRespondent: true,
      required: false,
      options: [],
      order: fields.length,
    },
  ];
};

const toDateValue = (value) => {
  if (!value) return undefined;
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) return undefined;
  return dateValue;
};

const buildActivityFormPayload = (templatePreset, payload = {}) => {
  const preset = normalizePreset(templatePreset);
  const clonedPreset = cloneTemplatePreset(preset, true);
  const fields = ensureFeedbackField(
    clonedPreset.altFormSchema.fields.map((field, idx) => ({
      ...cloneAltFormField(field, false),
      order: idx,
    }))
  );

  const settings = {
    ...(clonedPreset.altFormSchema.settings || {}),
    allowResubmit:
      "allowResubmit" in payload
        ? !!payload.allowResubmit
        : !!clonedPreset.altFormSchema.settings?.allowResubmit,
    allowLateSubmission:
      "allowLateSubmission" in payload
        ? !!payload.allowLateSubmission
        : !!clonedPreset.altFormSchema.settings?.allowLateSubmission,
  };
  const openAt = toDateValue(payload.openAt || settings.openAt);
  const dueAt = toDateValue(payload.dueAt || settings.closeAt);
  settings.openAt = openAt;
  settings.closeAt = dueAt;

  return {
    content: payload.content ?? preset.content ?? "",
    attachments: Array.isArray(payload.attachments)
      ? payload.attachments
      : preset.attachments,
    fields,
    settings,
    dueAt,
    openAt,
  };
};

const findNextActivityOrder = async (academyId, syllabusId) => {
  const latest = await Activity(academyId)
    .findOne({ syllabus: syllabusId, isActive: true })
    .sort({ order: -1, createdAt: -1 });
  return latest ? (latest.order || 0) + 1 : 0;
};

export const createActivityFromTemplate = async ({
  academyId,
  user,
  syllabus,
  template,
  payload = {},
}) => {
  const board = await ensureSyllabusAltBoard({ academyId, syllabus, user });
  const type = resolveActivityTypeOrThrow(payload.type, template?.type || "assignment");
  const preset = template?.preset || buildDefaultTemplatePreset(type);
  const {
    content,
    attachments,
    fields,
    settings,
    dueAt,
    openAt,
  } = buildActivityFormPayload(preset, payload);
  const activityStatus = resolveActivityStatusOrThrow(payload.status, "draft");
  const resolvedOpenAt =
    openAt || (activityStatus === "published" ? new Date() : undefined);
  const formSettings = {
    ...settings,
    ...(resolvedOpenAt ? { openAt: resolvedOpenAt } : {}),
  };

  const form = await AltForm(academyId).create({
    board: board._id,
    school: board.school,
    creator: user._id,
    creatorId: user.userId,
    creatorName: user.userName,
    title: payload.title,
    description: content,
    fields,
    settings: formSettings,
  });

  const sheet = await AltSheet(academyId).create({
    form: form._id,
    board: board._id,
    school: board.school,
    name: payload.title,
  });
  form.sheet = sheet._id;
  await form.save();

  const order =
    typeof payload.order === "number"
      ? payload.order
      : await findNextActivityOrder(academyId, syllabus._id);

  const activity = await Activity(academyId).create({
    syllabus: syllabus._id,
    season: syllabus.season,
    school: syllabus.school,
    schoolId: syllabus.schoolId,
    schoolName: syllabus.schoolName,
    year: syllabus.year,
    term: syllabus.term,
    classTitle: syllabus.classTitle,
    type,
    status: activityStatus,
    title: payload.title,
    content,
    attachments,
    altForm: form._id,
    altBoard: board._id,
    openAt: resolvedOpenAt,
    dueAt,
    allowLateSubmission: !!settings.allowLateSubmission,
    allowResubmit: !!settings.allowResubmit,
    evaluationMode: resolveActivityEvaluationModeOrThrow(
      payload.evaluationMode,
      "feedback"
    ),
    rubric: Array.isArray(payload.rubric) ? payload.rubric : preset.rubric || [],
    sourceTemplate: template?._id,
    order,
    creator: user._id,
    creatorId: user.userId,
    creatorName: user.userName,
  });

  await syncActivityCalendar(academyId, activity);
  return { activity, form, sheet, board };
};

export const updateActivityWithAltForm = async ({
  academyId,
  activity,
  payload = {},
}) => {
  const previousStatus = activity.status;
  if ("title" in payload) activity.title = payload.title;
  if ("content" in payload) activity.content = payload.content;
  if ("type" in payload) {
    activity.type = resolveActivityTypeOrThrow(payload.type, activity.type);
  }
  if ("status" in payload) {
    activity.status = resolveActivityStatusOrThrow(payload.status, activity.status);
  }
  if ("openAt" in payload) activity.openAt = toDateValue(payload.openAt);
  if ("dueAt" in payload) activity.dueAt = toDateValue(payload.dueAt);
  if ("allowLateSubmission" in payload) {
    activity.allowLateSubmission = !!payload.allowLateSubmission;
  }
  if ("allowResubmit" in payload) {
    activity.allowResubmit = !!payload.allowResubmit;
  }
  if ("evaluationMode" in payload) {
    activity.evaluationMode = resolveActivityEvaluationModeOrThrow(
      payload.evaluationMode,
      activity.evaluationMode
    );
  }
  if ("rubric" in payload && Array.isArray(payload.rubric)) {
    activity.rubric = payload.rubric;
  }
  if ("attachments" in payload && Array.isArray(payload.attachments)) {
    activity.attachments = payload.attachments;
  }
  const becamePublished =
    previousStatus !== "published" && activity.status === "published";
  if (becamePublished && !activity.openAt) {
    activity.openAt = new Date();
  }

  let form = null;
  if (activity.altForm) {
    form = await AltForm(academyId).findById(activity.altForm);
    if (form && form.isActive) {
      if ("title" in payload) {
        form.title = payload.title;
        await AltSheet(academyId).updateOne(
          { form: form._id },
          { name: payload.title }
        );
      }
      if ("content" in payload) {
        form.description = payload.content || "";
      }
      if (
        "openAt" in payload ||
        "dueAt" in payload ||
        "allowResubmit" in payload ||
        "allowLateSubmission" in payload ||
        becamePublished
      ) {
        form.settings = {
          ...(form.settings?.toObject?.() || form.settings || {}),
          ...(typeof payload.allowResubmit === "boolean"
            ? { allowResubmit: payload.allowResubmit }
            : {}),
          ...(typeof payload.allowLateSubmission === "boolean"
            ? { allowLateSubmission: payload.allowLateSubmission }
            : {}),
          ...(payload.openAt !== undefined
            ? { openAt: toDateValue(payload.openAt) }
            : becamePublished
              ? { openAt: activity.openAt }
              : {}),
          ...(payload.dueAt !== undefined
            ? { closeAt: toDateValue(payload.dueAt) }
            : {}),
        };
        form.markModified("settings");
      }
      await form.save();
    }
  }

  await activity.save();
  await syncActivityCalendar(academyId, activity);
  return { activity, form, becamePublished };
};

export const softDeleteActivity = async ({ academyId, activity }) => {
  activity.isActive = false;
  activity.status = "closed";
  await activity.save();

  if (activity.altForm) {
    await Promise.all([
      AltForm(academyId).updateOne({ _id: activity.altForm }, { isActive: false }),
      AltSheet(academyId).updateOne(
        { form: activity.altForm },
        { isActive: false }
      ),
    ]);
  }

  await CalendarEvent(academyId).deleteMany({
    sourceType: "activity",
    sourceId: { $regex: `^activity-${activity._id}-` },
  });
};

export const syncActivityCalendar = async (academyId, activity) => {
  const sourceIdPrefix = `activity-${activity._id}`;

  if (
    !activity.isActive ||
    activity.status !== "published" ||
    !activity.dueAt
  ) {
    await CalendarEvent(academyId).deleteMany({
      sourceType: "activity",
      sourceId: { $regex: `^${sourceIdPrefix}-` },
    });
    return;
  }

  const enrollments = await Enrollment(academyId)
    .find({ syllabus: activity.syllabus })
    .select("_id student");

  if (enrollments.length === 0) {
    await CalendarEvent(academyId).deleteMany({
      sourceType: "activity",
      sourceId: { $regex: `^${sourceIdPrefix}-` },
    });
    return;
  }

  const dueAt = new Date(activity.dueAt);
  const currentSourceIds = new Set();
  const ops = [];

  for (const enrollment of enrollments) {
    const sourceId = `${sourceIdPrefix}-${enrollment._id}`;
    currentSourceIds.add(sourceId);

    ops.push({
      updateOne: {
        filter: { sourceType: "activity", sourceId },
        update: {
          $set: {
            title: `${activity.title} 마감`,
            description: "",
            start: dueAt,
            end: dueAt,
            isAllDay: true,
            scope: "personal",
            school: activity.school,
            user: enrollment.student,
            sourceType: "activity",
            sourceId,
            syllabusId: activity.syllabus,
            color: "#f29900",
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length > 0) {
    await CalendarEvent(academyId).bulkWrite(ops, { ordered: false });
  }

  await CalendarEvent(academyId).deleteMany({
    sourceType: "activity",
    $and: [
      { sourceId: { $regex: `^${sourceIdPrefix}-` } },
      { sourceId: { $nin: Array.from(currentSourceIds) } },
    ],
  });
};
