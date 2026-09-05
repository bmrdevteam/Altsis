/**
 * AltFormAPI namespace
 * @namespace APIs.AltFormAPI
 * @see TAltForm in {@link Models.AltForm}
 */
import crypto from "crypto";
import { logger } from "../log/logger.js";
import { AltForm, AltFormFavorite, AltSheet, AltSheetOpen, AltSheetRow, Board, CalendarEvent } from "../models/index.js";
import { canManageForm, canModifyForm, getAltBoardRole, hasSubmittedForList, resolveUnreadResponseCount, validateExclusiveFormModes, applyWeekdayScheduleNormalize, isWeekdayScheduleEnabled, isInOccurrenceWindow, hasSubmittedCurrentOccurrence, getEffectiveTodoCloseAt, isFormMember, canViewAllRows, normalizeFormAccess, resolveFormMemberUsers, estimateWeekdayOccurrenceCount } from "../services/altForms.js";
import { cloneAltFormToBoard } from "../services/altFormClone.js";
import { buildApprovalAccessOr, sanitizeApprovalGroups } from "../utils/approvalLine.js";
import { isBoardNotificationEnabled } from "../services/notifications.js";
import { getUserRoleInSeason, isSeasonScopedBoard } from "../services/boards.js";
import {
  submittedSheetRowFilter,
  splitSheetRows,
} from "../utils/sheetRowQuery.js";
import { isFormFileKey } from "../_s3/formMulter.js";
import { assertNewAiChatFieldsAllowed } from "../services/formAiChat.js";
import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

const isHttpUrl = (url) => {
  try {
    const u = new URL(String(url || ""));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

/** 필드 배열에 _id가 없는 항목에 자동 생성 + 첨부 key/링크 URL 검증 */
const ensureFieldIds = (fields, academyId) => {
  const academyPrefix = academyId ? `${academyId}/` : "";
  return (fields || []).map((f) => {
    const next = { ...f, _id: f._id || crypto.randomUUID() };
    if (Array.isArray(f.attachments)) {
      next.attachments = f.attachments
        .filter((a) => a && a.originalName && a.key)
        .map((a) => {
          const key = String(a.key);
          if (
            academyPrefix &&
            (!key.startsWith(academyPrefix) || !isFormFileKey(key))
          ) {
            throw Object.assign(new Error("INVALID_ATTACHMENT_KEY"), {
              code: "INVALID_ATTACHMENT_KEY",
            });
          }
          return {
            originalName: String(a.originalName),
            key,
            mimeType: a.mimeType ? String(a.mimeType) : "",
            size: typeof a.size === "number" ? a.size : undefined,
          };
        });
      if (next.attachments.length === 0) delete next.attachments;
    }
    if (Array.isArray(f.links)) {
      next.links = f.links
        .filter((l) => l && l.url && isHttpUrl(l.url))
        .map((l) => ({
          title: l.title ? String(l.title) : "",
          url: String(l.url),
          ogTitle: l.ogTitle ? String(l.ogTitle) : "",
          ogDescription: l.ogDescription ? String(l.ogDescription) : "",
          ogImage:
            l.ogImage && isHttpUrl(l.ogImage) ? String(l.ogImage) : "",
        }));
      if (next.links.length === 0) delete next.links;
    }
    return next;
  });
};

/** 요일마다 필수 회차 수는 서버에서 기간·요일로 산출 (클라이언트 값 신뢰 금지) */
const syncWeekdayRequiredCount = (settings) => {
  if (!settings?.requiredMode || !settings?.allowMultipleResponses) {
    settings.requiredResponseCount = undefined;
    return;
  }
  if (isWeekdayScheduleEnabled({ settings })) {
    const est = estimateWeekdayOccurrenceCount({ settings });
    if (est != null && est >= 1) {
      settings.requiredResponseCount = Math.min(50, Math.floor(est));
      return;
    }
  }
  const n = Number(settings.requiredResponseCount);
  settings.requiredResponseCount =
    Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
};

/**
 * 목록용 메타: responseCount / mySubmitted / unreadResponseCount
 * (카드 N+1 방지를 위해 RAltForms에서 일괄 부착)
 * responseCount·unreadResponseCount는 admin/writer에게만 부착 (응답자·비멤버에게 집계 노출 방지)
 */
const enrichFormsWithListMeta = async (
  academyId,
  forms,
  userId,
  { includeResponseCount = false, attachCountsIf } = {}
) => {
  if (!forms?.length) return [];

  const formIds = forms.map((f) => f._id);

  const [countAgg, myRows, opens, favorites] = await Promise.all([
    includeResponseCount
      ? AltSheetRow(academyId).aggregate([
          {
            $match: {
              form: { $in: formIds },
              ...submittedSheetRowFilter(),
              _respondent: { $ne: null },
            },
          },
          { $group: { _id: "$form", count: { $sum: 1 } } },
        ])
      : Promise.resolve([]),
    AltSheetRow(academyId)
      .find({
        form: { $in: formIds },
        _respondent: userId,
        isActive: true,
      })
      .select("form createdAt _submittedAt isDraft")
      .lean(),
    includeResponseCount
      ? AltSheetOpen(academyId)
          .find({ user: userId, form: { $in: formIds } })
          .select("form lastOpenedAt")
          .lean()
      : Promise.resolve([]),
    AltFormFavorite(academyId)
      .find({ user: userId, form: { $in: formIds } })
      .select("form")
      .lean(),
  ]);

  const favoritedFormIds = new Set(
    (favorites || []).map((f) => f.form.toString())
  );

  const countByForm = new Map(
    countAgg.map((r) => [r._id.toString(), r.count])
  );
  const openedAtByForm = new Map(
    (opens || []).map((o) => [o.form.toString(), o.lastOpenedAt])
  );

  let unreadAggByForm = new Map();
  if (includeResponseCount && opens?.length > 0) {
    // 재제출은 createdAt이 유지되므로 updatedAt 기준. 본인 응답은 제외.
    const orClauses = opens
      .filter((o) => o.lastOpenedAt)
      .map((o) => ({
        form: o.form,
        updatedAt: { $gt: o.lastOpenedAt },
      }));
    if (orClauses.length > 0) {
      const unreadAgg = await AltSheetRow(academyId).aggregate([
        {
          $match: {
            ...submittedSheetRowFilter(),
            _respondent: { $nin: [null, userId] },
            $or: orClauses,
          },
        },
        { $group: { _id: "$form", count: { $sum: 1 } } },
      ]);
      unreadAggByForm = new Map(
        unreadAgg.map((r) => [r._id.toString(), r.count])
      );
    }
  }

  const myRowsByForm = new Map();
  for (const row of myRows) {
    const fid = row.form.toString();
    if (!myRowsByForm.has(fid)) myRowsByForm.set(fid, []);
    myRowsByForm.get(fid).push(row);
  }

  return forms.map((form) => {
    const plain = typeof form.toObject === "function" ? form.toObject() : form;
    const id = plain._id.toString();
    const mine = myRowsByForm.get(id) || [];
    const { draftRows, submittedRows } = splitSheetRows(mine);
    const now = new Date();
    const effectiveClose = getEffectiveTodoCloseAt(plain, now, submittedRows);
    const meta = {
      ...plain,
      isFavorited: favoritedFormIds.has(id),
      mySubmitted: hasSubmittedForList(plain, submittedRows),
      myResponseCount: submittedRows.length,
      myDraftCount: draftRows.length,
      inOccurrenceWindow: isWeekdayScheduleEnabled(plain)
        ? isInOccurrenceWindow(plain, now)
        : undefined,
      submittedCurrentOccurrence: isWeekdayScheduleEnabled(plain)
        ? hasSubmittedCurrentOccurrence(plain, submittedRows, now)
        : undefined,
      occurrenceCloseAt: effectiveClose
        ? effectiveClose instanceof Date
          ? effectiveClose.toISOString()
          : new Date(effectiveClose).toISOString()
        : null,
    };
    if (includeResponseCount && (!attachCountsIf || attachCountsIf(plain))) {
      meta.responseCount = countByForm.get(id) || 0;
      meta.unreadResponseCount = resolveUnreadResponseCount(
        id,
        openedAtByForm,
        unreadAggByForm
      );
    }
    return meta;
  });
};

/**
 * @memberof APIs.AltFormAPI
 * @function CAltForm API
 * @description Alt Form 생성 API (+ AltSheet 자동 생성)
 * @version 1.0.0
 */
export const create = async (req, res) => {
  try {
    for (let field of ["board", "title"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const board = await Board(req.user.academyId).findById(req.body.board);
    if (!board || !board.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageForm(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const createSettings = req.body.settings || { allowResubmit: false };
    const wsErr = applyWeekdayScheduleNormalize(createSettings);
    if (wsErr.error) {
      return res.status(400).send({ message: wsErr.error });
    }
    syncWeekdayRequiredCount(createSettings);
    const modeErr = validateExclusiveFormModes(createSettings);
    if (modeErr) {
      return res.status(400).send({ message: modeErr });
    }

    let fields;
    try {
      fields = ensureFieldIds(req.body.fields, req.user.academyId);
    } catch (e) {
      if (e.code === "INVALID_ATTACHMENT_KEY") {
        return res.status(400).send({ message: FIELD_INVALID("attachments") });
      }
      throw e;
    }

    try {
      await assertNewAiChatFieldsAllowed({
        academyId: req.user.academyId,
        user: req.user,
        board,
        previousFields: [],
        nextFields: fields,
        requestedSeasonId: req.body.season,
      });
    } catch (e) {
      if (e.status) {
        return res.status(e.status).send({ message: e.message });
      }
      throw e;
    }

    const form = await AltForm(req.user.academyId).create({
      board: board._id,
      school: board.school,
      creator: req.user._id,
      creatorId: req.user.userId,
      creatorName: req.user.userName,
      title: req.body.title,
      description: req.body.description || "",
      fields,
      rubrics: Array.isArray(req.body.rubrics) ? req.body.rubrics : [],
      approvalGroups: sanitizeApprovalGroups(req.body.approvalGroups),
      settings: createSettings,
      members: normalizeFormAccess(req.body.members),
      writers: normalizeFormAccess(req.body.writers),
      // 기본 비공개. 명시적으로 isDraft:false 일 때만 공개 생성
      isDraft: "isDraft" in req.body ? !!req.body.isDraft : true,
    });

    // AltSheet 자동 생성
    const sheet = await AltSheet(req.user.academyId).create({
      form: form._id,
      board: board._id,
      school: board.school,
      name: form.title,
    });

    form.sheet = sheet._id;
    await form.save();

    // 게시된 양식만 캘린더 동기화
    if (!form.isDraft) {
      syncFormCalendar(req.user.academyId, form, board, req.user).catch((err) =>
        logger.error(`Form calendar sync failed: ${err.message}`)
      );
    }

    return res.status(200).send({ form, sheet });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * Form 마감일 → CalendarEvent 동기화 (멤버별 개인 일정)
 */
async function syncFormCalendar(academyId, form, board, user) {
  const sourceIdPrefix = `altForm-${form._id}`;

  // 기존 school-scope 이벤트 정리 (레거시)
  await CalendarEvent(academyId).deleteMany({
    sourceType: "altForm",
    sourceId: sourceIdPrefix,
  });

  const clearMemberEvents = () =>
    CalendarEvent(academyId).deleteMany({
      sourceType: "altForm",
      sourceId: { $regex: `^${sourceIdPrefix}-` },
    });

  // 비공개·비활성 양식은 캘린더에서 제거
  if (form.isDraft || form.isActive === false) {
    await clearMemberEvents();
    return;
  }

  const enabled = await isBoardNotificationEnabled(
    academyId,
    board.school,
    board,
    "formDeadlineCalendar"
  );

  if (!enabled || !form.settings?.closeAt) {
    // 설정 비활성 또는 마감일 없음 → 멤버별 이벤트도 삭제
    await clearMemberEvents();
    return;
  }

  const closeAt = new Date(form.settings.closeAt);
  const members = await resolveFormMemberUsers(academyId, form, board);

  const currentSourceIds = new Set();
  const ops = [];

  for (const member of members) {
    const sourceId = `${sourceIdPrefix}-${member.user}`;
    currentSourceIds.add(sourceId);

    ops.push({
      updateOne: {
        filter: { sourceType: "altForm", sourceId },
        update: {
          $set: {
            title: `${form.title} 마감`,
            description: "",
            start: closeAt,
            end: closeAt,
            isAllDay: true,
            scope: "personal",
            user: member.user,
            sourceType: "altForm",
            sourceId,
            color: "#ea4335",
          },
        },
        upsert: true,
      },
    });
  }

  if (ops.length > 0) {
    await CalendarEvent(academyId).bulkWrite(ops, { ordered: false });
  }

  // 탈퇴한 멤버의 이벤트 정리
  await CalendarEvent(academyId).deleteMany({
    sourceType: "altForm",
    $and: [
      { sourceId: { $regex: `^${sourceIdPrefix}-` } },
      { sourceId: { $nin: Array.from(currentSourceIds) } },
    ],
  });
}

/**
 * @memberof APIs.AltFormAPI
 * @function RAltForms/RAltForm API
 * @description Alt Form 목록/상세 조회 API
 * @version 1.0.0
 */
export const find = async (req, res) => {
  try {
    /* RAltForm */
    if (req.params._id) {
      const form = await AltForm(req.user.academyId).findById(req.params._id);
      if (!form || !form.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("form") });
      }

      const board = await Board(req.user.academyId).findById(form.board);
      if (!board) {
        return res.status(404).send({ message: __NOT_FOUND("board") });
      }

      const role = getAltBoardRole(board, req.user);
      const schoolRole = await getUserRoleInSeason(
        req.user.academyId,
        board.schoolId,
        req.user,
        isSeasonScopedBoard(board) ? board.season : null
      );
      if (form.isDraft) {
        const isCreator =
          form.creator && form.creator.equals(req.user._id);
        if (!isCreator) {
          return res.status(403).send({ message: PERMISSION_DENIED });
        }
      } else if (!isFormMember(form, board, req.user, schoolRole)) {
        // 역할 없지만 승인자로 지정된 경우 접근 허용
        const accessOr = buildApprovalAccessOr(form, req.user.userId);
        if (accessOr.length === 0) {
          return res.status(403).send({ message: PERMISSION_DENIED });
        }
        const approverQuery = { form: form._id, ...submittedSheetRowFilter() };
        approverQuery.$or = accessOr;
        const approverRowCount = await AltSheetRow(req.user.academyId).countDocuments(approverQuery);
        if (approverRowCount === 0) {
          return res.status(403).send({ message: PERMISSION_DENIED });
        }
      }

      return res.status(200).send({ form });
    }

    /* RAltForms */
    if (!("board" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("board") });
    }

    const board = await Board(req.user.academyId).findById(req.query.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const role = getAltBoardRole(board, req.user);
    const schoolRole = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user,
      isSeasonScopedBoard(board) ? board.season : null
    );

    const forms = await AltForm(req.user.academyId)
      .find({
        board: board._id,
        isActive: true,
        $or: [
          { isDraft: { $ne: true } },
          { creator: req.user._id },
        ],
      })
      .sort({ createdAt: -1 });

    const visibleForms = forms.filter((form) => {
      if (form.isDraft) {
        return form.creator && form.creator.equals(req.user._id);
      }
      return isFormMember(form, board, req.user, schoolRole);
    });

    if (!role && visibleForms.length === 0) {
      // 양식이 없으면 빈 배열 반환 (공지사항 등 alt-form이 없는 보드)
      if (forms.length === 0) {
        return res.status(200).send({ forms: [] });
      }
      // 역할 없지만 승인자로 지정된 양식만 반환
      const approverForms = [];
      for (const form of forms) {
        const accessOr = buildApprovalAccessOr(form, req.user.userId);
        if (accessOr.length === 0) continue;
        const approverQuery = { form: form._id, ...submittedSheetRowFilter() };
        approverQuery.$or = accessOr;
        const count = await AltSheetRow(req.user.academyId).countDocuments(approverQuery);
        if (count > 0) approverForms.push(form);
      }
      // 승인자 양식도 없으면 빈 배열 반환 (403 대신)
      const enrichedApprover = await enrichFormsWithListMeta(
        req.user.academyId,
        approverForms,
        req.user._id,
        { includeResponseCount: false }
      );
      return res.status(200).send({ forms: enrichedApprover });
    }

    const canSeeAnyCounts = visibleForms.some((form) =>
      canViewAllRows(form, board, req.user, schoolRole)
    );
    const enriched = await enrichFormsWithListMeta(
      req.user.academyId,
      visibleForms,
      req.user._id,
      {
        includeResponseCount: canSeeAnyCounts,
        attachCountsIf: (form) =>
          canViewAllRows(form, board, req.user, schoolRole),
      }
    );
    return res.status(200).send({ forms: enriched });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function UAltForm API
 * @description Alt Form 수정 API
 * @version 1.0.0
 */
export const update = async (req, res) => {
  try {
    const form = await AltForm(req.user.academyId).findById(req.params._id);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canModifyForm(form, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 삭제된 필드 추적 (data에서 해당 키 제거용)
    const deletedFieldIds = [];
    if (req.body.fields) {
      const newFieldIds = new Set(
        req.body.fields.filter((f) => f._id).map((f) => f._id.toString())
      );
      for (const oldField of form.fields) {
        if (!newFieldIds.has(oldField._id.toString())) {
          deletedFieldIds.push(oldField._id.toString());
        }
      }
    }

    if ("title" in req.body) form.title = req.body.title;
    if ("description" in req.body) form.description = req.body.description;
    if ("fields" in req.body) {
      try {
        const nextFields = ensureFieldIds(req.body.fields, req.user.academyId);
        await assertNewAiChatFieldsAllowed({
          academyId: req.user.academyId,
          user: req.user,
          board,
          previousFields: form.fields,
          nextFields,
          requestedSeasonId: req.body.season,
        });
        form.fields = nextFields;
      } catch (e) {
        if (e.code === "INVALID_ATTACHMENT_KEY") {
          return res.status(400).send({ message: FIELD_INVALID("attachments") });
        }
        if (e.status) {
          return res.status(e.status).send({ message: e.message });
        }
        throw e;
      }
    }
    if ("rubrics" in req.body) {
      form.rubrics = Array.isArray(req.body.rubrics) ? req.body.rubrics : [];
      form.markModified("rubrics");
    }
    if ("approvalGroups" in req.body) {
      form.approvalGroups = sanitizeApprovalGroups(req.body.approvalGroups);
      form.markModified("approvalGroups");
    }
    if ("settings" in req.body) {
      Object.assign(form.settings, req.body.settings);
      // 레거시 필드 정리
      form.settings.maxResponsesPerUser = undefined;
      form.settings.responseInterval = undefined;
      const wsErr = applyWeekdayScheduleNormalize(form.settings);
      if (wsErr.error) {
        return res.status(400).send({ message: wsErr.error });
      }
      syncWeekdayRequiredCount(form.settings);
      const modeErr = validateExclusiveFormModes(form.settings);
      if (modeErr) {
        return res.status(400).send({ message: modeErr });
      }
      form.markModified("settings");
    }

    if ("isDraft" in req.body) {
      form.isDraft = !!req.body.isDraft;
    }
    if ("members" in req.body) {
      form.members = normalizeFormAccess(req.body.members);
      form.markModified("members");
    }
    if ("writers" in req.body) {
      form.writers = normalizeFormAccess(req.body.writers);
      form.markModified("writers");
    }

    await form.save();

    // Sheet 이름 동기화
    if ("title" in req.body) {
      await AltSheet(req.user.academyId).updateOne(
        { form: form._id },
        { name: form.title }
      );
    }

    // 삭제된 필드의 데이터를 SheetRow에서 제거
    if (deletedFieldIds.length > 0) {
      const unsetObj = {};
      for (const fieldId of deletedFieldIds) {
        unsetObj[`data.${fieldId}`] = "";
      }
      await AltSheetRow(req.user.academyId).updateMany(
        { form: form._id },
        { $unset: unsetObj }
      );
    }

    // 공개면 동기화, 비공개면 일정 제거
    syncFormCalendar(req.user.academyId, form, board, req.user).catch((err) =>
      logger.error(`Form calendar sync failed: ${err.message}`)
    );

    return res.status(200).send({ form });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function DAltForm API
 * @description Alt Form 삭제 API (soft delete, Sheet도 함께)
 * @version 1.0.0
 */
export const remove = async (req, res) => {
  try {
    const form = await AltForm(req.user.academyId).findById(req.params._id);
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canModifyForm(form, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 공개 중이면 삭제 불가 — 비공개로 전환 후 삭제
    if (!form.isDraft) {
      return res.status(400).send({
        message: "공개 중인 양식은 비공개로 전환한 뒤 삭제할 수 있습니다.",
      });
    }

    form.isActive = false;
    await form.save();

    // Sheet도 비활성화
    await AltSheet(req.user.academyId).updateOne(
      { form: form._id },
      { isActive: false }
    );

    // SheetRow도 비활성화
    await AltSheetRow(req.user.academyId).updateMany(
      { form: form._id },
      { isActive: false }
    );

    // 캘린더 잔여 일정 정리
    syncFormCalendar(req.user.academyId, form, board, req.user).catch((err) =>
      logger.error(`Form calendar sync failed: ${err.message}`)
    );

    await AltFormFavorite(req.user.academyId).deleteMany({ form: form._id });

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function ExportAltForm API
 * @description Alt Form JSON 내보내기 (구조만, 데이터 제외)
 */
export const exportForm = async (req, res) => {
  try {
    const form = await AltForm(req.user.academyId).findById(req.params._id);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }
    if (!canModifyForm(form, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const exported = {
      title: form.title,
      description: form.description,
      fields: form.fields.map((f) => ({
        label: f.label,
        type: f.type,
        permission: f.permission,
        visibleToRespondent: f.visibleToRespondent,
        required: f.required,
        options: f.options,
        validation: f.validation,
        content: f.content,
        order: f.order,
        displayCondition: f.displayCondition,
        correctAnswer: f.correctAnswer,
        points: f.points,
        gradingMethod: f.gradingMethod,
        rubricId: f.rubricId,
        rubricIds: f.rubricIds,
        duplicateCheck: f.duplicateCheck,
        approvalLine: f.approvalLine,
        circulation: f.circulation,
        attachments: f.attachments,
        links: f.links,
      })),
      rubrics: form.rubrics || [],
      approvalGroups: form.approvalGroups || [],
      settings: {
        allowResubmit: form.settings?.allowResubmit,
        allowMultipleResponses: form.settings?.allowMultipleResponses,
        requiredResponseCount: form.settings?.requiredResponseCount,
        requiredMode: form.settings?.requiredMode,
        quizMode: form.settings?.quizMode,
        quizSettings: form.settings?.quizSettings,
        assessmentMode: form.settings?.assessmentMode,
        assessmentSettings: form.settings?.assessmentSettings,
        directInputMode: form.settings?.directInputMode,
        shareResponses: form.settings?.shareResponses,
        showOwnerFields: form.settings?.showOwnerFields,
        showOwnResponse: form.settings?.showOwnResponse,
        openAt: form.settings?.openAt,
        closeAt: form.settings?.closeAt,
        weekdaySchedule: form.settings?.weekdaySchedule,
      },
    };

    return res.status(200).send({ formData: exported });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function ImportAltForm API
 * @description Alt Form JSON 가져오기 (새 Form+Sheet 생성)
 */
export const importForm = async (req, res) => {
  try {
    for (let field of ["board", "formData"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const board = await Board(req.user.academyId).findById(req.body.board);
    if (!board || !board.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageForm(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const fd = req.body.formData;
    const importSettings = fd.settings || { allowResubmit: false };
    const wsErr = applyWeekdayScheduleNormalize(importSettings);
    if (wsErr.error) {
      return res.status(400).send({ message: wsErr.error });
    }
    syncWeekdayRequiredCount(importSettings);
    const modeErr = validateExclusiveFormModes(importSettings);
    if (modeErr) {
      return res.status(400).send({ message: modeErr });
    }
    let importFields;
    try {
      importFields = ensureFieldIds(fd.fields, req.user.academyId);
    } catch (e) {
      if (e.code === "INVALID_ATTACHMENT_KEY") {
        return res.status(400).send({ message: FIELD_INVALID("attachments") });
      }
      throw e;
    }
    try {
      await assertNewAiChatFieldsAllowed({
        academyId: req.user.academyId,
        user: req.user,
        board,
        previousFields: [],
        nextFields: importFields,
        requestedSeasonId: req.body.season,
      });
    } catch (e) {
      if (e.status) {
        return res.status(e.status).send({ message: e.message });
      }
      throw e;
    }
    const form = await AltForm(req.user.academyId).create({
      board: board._id,
      school: board.school,
      creator: req.user._id,
      creatorId: req.user.userId,
      creatorName: req.user.userName,
      title: fd.title || "가져온 양식",
      description: fd.description || "",
      fields: importFields,
      rubrics: Array.isArray(fd.rubrics) ? fd.rubrics : [],
      approvalGroups: sanitizeApprovalGroups(fd.approvalGroups),
      settings: importSettings,
    });

    const sheet = await AltSheet(req.user.academyId).create({
      form: form._id,
      board: board._id,
      school: board.school,
      name: form.title,
    });

    form.sheet = sheet._id;
    await form.save();

    return res.status(200).send({ form, sheet });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function DuplicateAltForm API
 * @description Alt Form 복제 (구조만, 데이터 없음)
 */
export const duplicate = async (req, res) => {
  try {
    const original = await AltForm(req.user.academyId).findById(req.params._id);
    if (!original || !original.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(original.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageForm(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    try {
      await assertNewAiChatFieldsAllowed({
        academyId: req.user.academyId,
        user: req.user,
        board,
        previousFields: [],
        nextFields: original.fields,
        requestedSeasonId: req.body.season,
      });
    } catch (e) {
      if (e.status) {
        return res.status(e.status).send({ message: e.message });
      }
      throw e;
    }

    const { form, sheet } = await cloneAltFormToBoard(
      req.user.academyId,
      original,
      board,
      req.user,
      { keepTitle: false }
    );

    return res.status(200).send({ form, sheet });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltFormAPI
 * @function UAltFormSheetOpened API
 * @description 기록(시트) 열람 시각 upsert — unreadResponseCount 기준점
 */
export const markSheetOpened = async (req, res) => {
  try {
    const form = await AltForm(req.user.academyId).findById(req.params._id);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const schoolRole = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user,
      isSeasonScopedBoard(board) ? board.season : null
    );
    if (!canViewAllRows(form, board, req.user, schoolRole)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const now = new Date();
    const open = await AltSheetOpen(req.user.academyId).findOneAndUpdate(
      { user: req.user._id, form: form._id },
      {
        $set: {
          lastOpenedAt: now,
          board: board._id,
        },
        $setOnInsert: {
          user: req.user._id,
          form: form._id,
        },
      },
      { upsert: true, new: true }
    );

    return res.status(200).send({
      form: form._id,
      lastOpenedAt: open.lastOpenedAt,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
