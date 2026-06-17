import crypto from "crypto";
import {
  Activity,
  ActivitySubmission,
  ActivityTemplate,
  AltForm,
  AltSheet,
  AltSheetRow,
  Board,
  CalendarEvent,
  Enrollment,
  Registration,
  Syllabus,
} from "../models/index.js";
import { getBoardMembers } from "../services/boards.js";
import { hasPermission } from "./seasons.js";

export const BUILTIN_TEMPLATES = [
  {
    scope: "builtin",
    name: "과제",
    type: "assignment",
    description: "학생이 과제를 제출하고 교사가 피드백을 제공합니다.",
    isEditable: false,
    preset: {
      content: "",
      altFormSchema: [
        {
          key: "response",
          label: "과제 제출",
          type: "textarea",
          required: true,
        },
        {
          key: "attachments",
          label: "첨부 파일",
          type: "file",
          required: false,
        },
      ],
      rubric: [],
    },
  },
  {
    scope: "builtin",
    name: "퀴즈",
    type: "quiz",
    description: "객관식/주관식 퀴즈를 진행합니다.",
    isEditable: false,
    preset: {
      content: "",
      altFormSchema: [
        {
          key: "answer",
          label: "답변",
          type: "textarea",
          required: true,
        },
      ],
      rubric: [],
    },
  },
  {
    scope: "builtin",
    name: "토론",
    type: "discussion",
    description: "학생들이 토론에 참여합니다.",
    isEditable: false,
    preset: {
      content: "",
      altFormSchema: [
        {
          key: "post",
          label: "토론 글",
          type: "textarea",
          required: true,
        },
      ],
      rubric: [],
    },
  },
];

const mapFieldType = (type) => {
  const map = {
    markdown: "textarea",
    text: "text",
    textarea: "textarea",
    file: "file",
    radio: "radio",
    checkbox: "checkbox",
  };
  return map[type] || "textarea";
};

export const convertTemplateFields = (schema = []) =>
  schema.map((field, index) => ({
    _id: field.key || crypto.randomUUID(),
    label: field.label,
    type: mapFieldType(field.type),
    permission: "respondent",
    required: field.required ?? false,
    options: field.options,
    order: index,
  }));

export const seedBuiltinTemplates = async (academyId) => {
  const count = await ActivityTemplate(academyId).countDocuments({
    scope: "builtin",
  });
  if (count === 0) {
    await ActivityTemplate(academyId).insertMany(BUILTIN_TEMPLATES);
  }
};

export class ActivityService {
  constructor(academyId) {
    this.academyId = academyId;
  }

  isMentorOfSyllabus = (syllabus, user) => {
    if (user.auth === "manager" || user.auth === "admin") return true;
    if (syllabus.user?.toString() === user._id.toString()) return true;
    return syllabus.teachers?.some(
      (t) => t.userId === user.userId || t._id?.toString() === user._id.toString()
    );
  };

  checkActivityPermission = async (user, syllabus) => {
    const registration = await Registration(this.academyId).findOne({
      user: user._id,
      season: syllabus.season,
    });
    if (!registration?.permissionActivityV2) {
      return { allowed: false, registration };
    }
    return { allowed: true, registration };
  };

  ensureAltBoard = async (syllabus, user) => {
    if (syllabus.altBoard) {
      const existing = await Board(this.academyId).findById(syllabus.altBoard);
      if (existing?.isActive) return existing;
    }

    const baseSlug = `alt-${syllabus.classTitle
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || `class-${Date.now()}`}`;

    let slug = baseSlug;
    let slugSuffix = 1;
    while (
      await Board(this.academyId).findOne({ school: syllabus.school, slug })
    ) {
      slugSuffix++;
      slug = `${baseSlug}-${slugSuffix}`;
    }

    const altBoardRole = new Map();
    const memberUsers = [];
    const writerUsers = [];

    for (const teacher of syllabus.teachers) {
      altBoardRole.set(teacher._id.toString(), "admin");
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
    if (!altBoardRole.has(syllabus.user.toString())) {
      altBoardRole.set(syllabus.user.toString(), "admin");
    }

    const enrollments = await Enrollment(this.academyId).find({
      syllabus: syllabus._id,
    });
    for (const enrollment of enrollments) {
      if (!altBoardRole.has(enrollment.student.toString())) {
        altBoardRole.set(enrollment.student.toString(), "respondent");
        memberUsers.push({
          user: enrollment.student,
          userId: enrollment.studentId,
          userName: enrollment.studentName,
        });
      }
    }

    const board = await Board(this.academyId).create({
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

  createAltFormForActivity = async ({
    board,
    activity,
    fields,
    settings,
    user,
  }) => {
    const form = await AltForm(this.academyId).create({
      board: board._id,
      school: board.school,
      creator: user._id,
      creatorId: user.userId,
      creatorName: user.userName,
      title: activity.title,
      description: activity.content || "",
      fields,
      settings: settings || { allowResubmit: activity.allowResubmit ?? false },
    });

    const sheet = await AltSheet(this.academyId).create({
      form: form._id,
      board: board._id,
      school: board.school,
      name: form.title,
    });

    form.sheet = sheet._id;
    await form.save();
    return form;
  };

  syncActivityCalendar = async (activity, board) => {
    const sourceIdPrefix = `activity-${activity._id}`;

    if (!activity.dueAt || activity.status === "draft") {
      await CalendarEvent(this.academyId).deleteMany({
        sourceType: "activity",
        sourceId: { $regex: `^${sourceIdPrefix}-` },
      });
      return;
    }

    const dueAt = new Date(activity.dueAt);
    const members = await getBoardMembers(this.academyId, board);
    const currentSourceIds = new Set();
    const ops = [];

    for (const member of members) {
      const sourceId = `${sourceIdPrefix}-${member.user}`;
      currentSourceIds.add(sourceId);
      ops.push({
        updateOne: {
          filter: { sourceType: "activity", sourceId },
          update: {
            $set: {
              title: `${activity.title} 마감`,
              description: activity.content || "",
              start: dueAt,
              end: dueAt,
              isAllDay: true,
              scope: "personal",
              user: member.user,
              school: board.school,
              sourceType: "activity",
              sourceId,
              syllabusId: activity.syllabus,
              color: "#ea4335",
            },
          },
          upsert: true,
        },
      });
    }

    if (ops.length > 0) {
      await CalendarEvent(this.academyId).bulkWrite(ops, { ordered: false });
    }

    await CalendarEvent(this.academyId).deleteMany({
      sourceType: "activity",
      $and: [
        { sourceId: { $regex: `^${sourceIdPrefix}-` } },
        { sourceId: { $nin: Array.from(currentSourceIds) } },
      ],
    });
  };

  ensureSubmissionsForEnrollments = async (activity) => {
    const enrollments = await Enrollment(this.academyId).find({
      syllabus: activity.syllabus,
    });
    for (const enrollment of enrollments) {
      await ActivitySubmission(this.academyId).findOneAndUpdate(
        { activity: activity._id, enrollment: enrollment._id },
        {
          $setOnInsert: {
            activity: activity._id,
            enrollment: enrollment._id,
            student: enrollment.student,
            studentId: enrollment.studentId,
            studentName: enrollment.studentName,
            studentGrade: enrollment.grade,
            status: "not_started",
          },
        },
        { upsert: true }
      );
    }
  };

  createFromTemplate = async ({
    syllabus,
    template,
    title,
    dueAt,
    openAt,
    content,
    user,
  }) => {
    const board = await this.ensureAltBoard(syllabus, user);
    const maxOrder = await Activity(this.academyId)
      .findOne({ syllabus: syllabus._id })
      .sort({ order: -1 })
      .select("order");
    const order = (maxOrder?.order ?? -1) + 1;

    const activity = await Activity(this.academyId).create({
      syllabus: syllabus._id,
      season: syllabus.season,
      school: syllabus.school,
      schoolId: syllabus.schoolId,
      schoolName: syllabus.schoolName,
      year: syllabus.year,
      term: syllabus.term,
      title,
      type: template.type,
      status: "draft",
      content: content ?? template.preset?.content ?? "",
      rubric: template.preset?.rubric ?? [],
      sourceTemplate: template._id,
      order,
      dueAt,
      openAt,
      altBoard: board._id,
      user: user._id,
      userId: user.userId,
      userName: user.userName,
    });

    const fields = convertTemplateFields(template.preset?.altFormSchema);
    const form = await this.createAltFormForActivity({
      board,
      activity,
      fields,
      settings: {
        openAt: openAt ? new Date(openAt) : undefined,
        closeAt: dueAt ? new Date(dueAt) : undefined,
        allowResubmit: activity.allowResubmit,
      },
      user,
    });

    activity.altForm = form._id;
    await activity.save();
    await this.syncActivityCalendar(activity, board);
    return activity;
  };

  publish = async (activity) => {
    activity.status = "published";
    await activity.save();

    if (activity.altForm) {
      await AltForm(this.academyId).findByIdAndUpdate(activity.altForm, {
        isActive: true,
      });
    }

    await this.ensureSubmissionsForEnrollments(activity);

    const board = activity.altBoard
      ? await Board(this.academyId).findById(activity.altBoard)
      : null;
    if (board) await this.syncActivityCalendar(activity, board);
    return activity;
  };

  close = async (activity) => {
    activity.status = "closed";
    await activity.save();
    const board = activity.altBoard
      ? await Board(this.academyId).findById(activity.altBoard)
      : null;
    if (board) await this.syncActivityCalendar(activity, board);
    return activity;
  };

  remove = async (activity) => {
    await ActivitySubmission(this.academyId).deleteMany({
      activity: activity._id,
    });

    if (activity.altForm) {
      const form = await AltForm(this.academyId).findById(activity.altForm);
      if (form) {
        await AltSheetRow(this.academyId).updateMany(
          { form: form._id },
          { isActive: false }
        );
        form.isActive = false;
        await form.save();
      }
    }

    await CalendarEvent(this.academyId).deleteMany({
      sourceType: "activity",
      sourceId: { $regex: `^activity-${activity._id}-` },
    });

    await activity.remove();
  };
}

export class ActivityTemplateService {
  constructor(academyId) {
    this.academyId = academyId;
  }

  list = async ({ scope, school, user }) => {
    await seedBuiltinTemplates(this.academyId);
    const query = {};
    if (scope) query.scope = scope;

    return ActivityTemplate(this.academyId)
      .find({
        $or: [
          { scope: "builtin" },
          ...(school ? [{ scope: "school", school }] : []),
          ...(user ? [{ scope: "personal", user: user._id }] : []),
        ],
        ...query,
      })
      .sort({ scope: 1, type: 1, name: 1 });
  };

  duplicate = async (template, user, { name, scope, school }) => {
    return ActivityTemplate(this.academyId).create({
      scope: scope || "personal",
      school: school || template.school,
      schoolId: template.schoolId,
      schoolName: template.schoolName,
      name: name || `${template.name} (복사본)`,
      type: template.type,
      description: template.description,
      preset: template.preset,
      isEditable: true,
      user: user._id,
      userId: user.userId,
      userName: user.userName,
    });
  };
}

export { hasPermission };
