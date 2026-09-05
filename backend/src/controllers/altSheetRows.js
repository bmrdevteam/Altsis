/**
 * AltSheetRowAPI namespace
 * @namespace APIs.AltSheetRowAPI
 * @see TAltSheetRow in {@link Models.AltSheetRow}
 */
import { logger } from "../log/logger.js";
import { AltForm, AltFormDupCounter, AltSheet, AltSheetRow, Board, User, School } from "../models/index.js";
import {
  getAltBoardRole,
  canRespondForm,
  canViewAllRows,
  isFormMember,
  isAccessListCustom,
  getFormViewerRole,
  resolveFormMemberUsers,
  checkMultipleResponseLimit,
  isWeekdayScheduleEnabled,
  resolveOccurrenceKey,
  getVisibleFields,
  isFieldVisible,
  gradeQuizRow,
  applyAssessmentOnSubmit,
  filterAssessmentForViewer,
  applyAssessmentGradePatch,
  finalizeAssessment,
  unfinalizeAssessment,
  recomputeAssessmentTotals,
  getDuplicateCheckFields,
  buildDupCounterKeys,
} from "../services/altForms.js";
import {
  checkDraftSaveLimit,
  collectRespondentFieldData,
  canOwnerDeleteDraft,
  needsAllowResubmitToEdit,
} from "../services/sheetRowDraft.js";
import { assertAiChatRequiredOnSubmit } from "../services/formAiChat.js";
import {
  submittedSheetRowFilter,
  isDraftSheetRow,
  splitSheetRows,
} from "../utils/sheetRowQuery.js";
import { getUserRoleInSeason, isSeasonScopedBoard } from "../services/boards.js";
import { getSchoolTodosForUser } from "../services/schoolTodos.js";
import { sendAutoNotification, isBoardNotificationEnabled } from "../services/notifications.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import { coerceFieldValueFromCsv } from "../utils/timetableSlots.js";
import {
  validateApprovalSubmit,
  buildApprovalOnSubmit,
  validateCirculationSubmit,
  buildCirculationOnSubmit,
  collectStoredCirculatees,
  buildApprovalAccessOr,
  applyApprovalAction,
  isCurrentApprover,
  isCirculatee,
  isStoredCirculatee,
  normalizeApprovalValue,
} from "../utils/approvalLine.js";

const schoolRoleOf = (academyId, board, user) =>
  getUserRoleInSeason(
    academyId,
    board.schoolId,
    user,
    isSeasonScopedBoard(board) ? board.season : null
  );

/**
 * 자유 모드 중복 검사 카운터 atomic claim
 * @param {string} academyId
 * @param {ObjectId} formId
 * @param {string} key - 직렬화된 필드값 조합 키
 * @param {number} allowedCount - 허용 수
 * @returns {boolean} true면 claim 성공
 */
async function claimDupCounter(academyId, formId, key, allowedCount) {
  try {
    const counter = await AltFormDupCounter(academyId).findOneAndUpdate(
      { form: formId, key, count: { $lt: allowedCount } },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
    return !!counter;
  } catch (err) {
    if (err.code === 11000) {
      // upsert 충돌: upsert 없이 재시도
      const counter = await AltFormDupCounter(academyId).findOneAndUpdate(
        { form: formId, key, count: { $lt: allowedCount } },
        { $inc: { count: 1 } },
        { new: true }
      );
      return !!counter;
    }
    throw err;
  }
}

/**
 * 자유 모드 중복 검사 카운터 롤백 (claim된 키들의 count를 -1)
 * @param {string} academyId
 * @param {ObjectId} formId
 * @param {string[]} keys - 롤백할 키 배열
 */
async function rollbackDupCounters(academyId, formId, keys) {
  for (const key of keys) {
    await AltFormDupCounter(academyId).findOneAndUpdate(
      { form: formId, key, count: { $gt: 0 } },
      { $inc: { count: -1 } }
    );
  }
}

/**
 * docResponse: 필수면 비어 있으면 거부, 필수+템플릿과 동일하면 거부
 * @returns {string|null} 오류 메시지 또는 null
 */
function validateDocResponseField(field, value) {
  const template = (field.content ?? "").trim();
  const answer = typeof value === "string" ? value.trim() : "";
  if (field.required && !answer) {
    return `필수 항목을 입력해주세요: ${field.label}`;
  }
  if (field.required && template && answer === template) {
    return `템플릿을 수정한 뒤 제출해 주세요: ${field.label}`;
  }
  return null;
}

const sortMyRowsForReview = (rows = []) => {
  const { draftRows, submittedRows } = splitSheetRows(rows);
  const byTime = (key) => (a, b) => {
    const ta = a[key] ? new Date(a[key]).getTime() : 0;
    const tb = b[key] ? new Date(b[key]).getTime() : 0;
    return tb - ta;
  };
  draftRows.sort(byTime("_updatedAt"));
  submittedRows.sort(byTime("_submittedAt"));
  return [...draftRows, ...submittedRows];
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function CAltSheetRowDraft API
 * @description 미제출 초안 저장 (필수·중복·결재·퀴즈 없음)
 */
export const saveDraft = async (req, res) => {
  try {
    for (let field of ["form", "data"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const form = await AltForm(req.user.academyId).findById(req.body.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const schoolRole = await schoolRoleOf(
      req.user.academyId,
      board,
      req.user
    );
    const respondCheck = canRespondForm(
      form,
      board,
      req.user,
      new Date(),
      schoolRole
    );
    if (!respondCheck.allowed) {
      return res.status(403).send({ message: respondCheck.message });
    }

    const myRows = await AltSheetRow(req.user.academyId)
      .find({
        form: form._id,
        _respondent: req.user._id,
        isActive: true,
      })
      .lean();
    const { draftRows, submittedRows } = splitSheetRows(myRows);

    let existing = null;
    if (req.body.row) {
      existing = await AltSheetRow(req.user.academyId).findById(req.body.row);
      if (!existing || !existing.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("row") });
      }
      const existingFormId = existing.form?._id || existing.form;
      if (String(existingFormId) !== String(form._id)) {
        return res.status(400).send({ message: "양식이 일치하지 않습니다." });
      }
      const respondentId = existing._respondent?._id || existing._respondent;
      if (!respondentId || String(respondentId) !== String(req.user._id)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      if (!isDraftSheetRow(existing)) {
        return res.status(400).send({
          message: "제출된 응답은 저장이 아니라 제출로 수정합니다.",
        });
      }
    }

    const requestedOccurrenceKey =
      typeof req.body.weekdayOccurrenceKey === "string"
        ? req.body.weekdayOccurrenceKey
        : null;
    const limitCheck = checkDraftSaveLimit(form, submittedRows, draftRows, {
      updatingDraftId: existing?._id?.toString?.(),
      now: new Date(),
      occurrenceKey: requestedOccurrenceKey,
    });
    if (!limitCheck.allowed) {
      return res.status(409).send({ message: limitCheck.message });
    }
    if (!existing && limitCheck.existingDraft) {
      existing = await AltSheetRow(req.user.academyId).findById(
        limitCheck.existingDraft._id
      );
    }

    const { data } = collectRespondentFieldData(form, req.body.data);
    const now = new Date();
    let occurrenceKeyToStamp;
    if (isWeekdayScheduleEnabled(form)) {
      if (existing?._weekdayOccurrenceKey) {
        occurrenceKeyToStamp = existing._weekdayOccurrenceKey;
      } else {
        const resolved = resolveOccurrenceKey(
          form,
          now,
          requestedOccurrenceKey,
          submittedRows
        );
        if (resolved.error) {
          return res.status(403).send({ message: resolved.error });
        }
        occurrenceKeyToStamp = resolved.occurrence?.key;
      }
    }

    if (existing) {
      for (const [fieldId, value] of Object.entries(data)) {
        existing.data.set(fieldId, value);
      }
      existing.isDraft = true;
      existing._submittedAt = undefined;
      existing._updatedAt = now;
      if (occurrenceKeyToStamp && !existing._weekdayOccurrenceKey) {
        existing._weekdayOccurrenceKey = occurrenceKeyToStamp;
      }
      existing.markModified("data");
      await existing.save();
      return res.status(200).send({ row: existing });
    }

    const row = await AltSheetRow(req.user.academyId).create({
      sheet: form.sheet,
      form: form._id,
      board: form.board,
      _respondent: req.user._id,
      _respondentId: req.user.userId,
      _respondentName: req.user.userName,
      data,
      isDraft: true,
      _updatedAt: now,
      ...(occurrenceKeyToStamp
        ? { _weekdayOccurrenceKey: occurrenceKeyToStamp }
        : {}),
    });

    return res.status(200).send({ row });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function CAltSheetRow API
 * @description Form 응답 제출 또는 기존 행 수정 (`row` + allowResubmit)
 * @version 1.0.0
 */
export const create = async (req, res) => {
  try {
    for (let field of ["form", "data"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const form = await AltForm(req.user.academyId).findById(req.body.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 응답 권한 + 공개 기간 확인 (학교 역할 그룹 멤버십 반영)
    const schoolRole = await schoolRoleOf(
      req.user.academyId,
      board,
      req.user
    );
    const respondCheck = canRespondForm(
      form,
      board,
      req.user,
      new Date(),
      schoolRole
    );
    if (!respondCheck.allowed) {
      return res.status(403).send({ message: respondCheck.message });
    }

    // 기존 응답: 단건 재제출, 초안 승격, 또는 복수 응답에서 지정한 행 수정
    let existing = null;
    let promotingDraft = false;
    if (req.body.row) {
      existing = await AltSheetRow(req.user.academyId).findById(req.body.row);
      if (!existing || !existing.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("row") });
      }
      const existingFormId = existing.form?._id || existing.form;
      if (String(existingFormId) !== String(form._id)) {
        return res.status(400).send({ message: "양식이 일치하지 않습니다." });
      }
      const respondentId = existing._respondent?._id || existing._respondent;
      if (!respondentId || String(respondentId) !== String(req.user._id)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      promotingDraft = isDraftSheetRow(existing);
      if (needsAllowResubmitToEdit(existing) && !form.settings.allowResubmit) {
        return res.status(403).send({ message: "응답 수정이 허용되지 않았습니다." });
      }
    } else if (!form.settings.allowMultipleResponses) {
      const mine = await AltSheetRow(req.user.academyId).find({
        form: form._id,
        _respondent: req.user._id,
        isActive: true,
      });
      const submittedDoc = mine.find((r) => !isDraftSheetRow(r));
      const draftDoc = mine.find((r) => isDraftSheetRow(r));
      if (submittedDoc) {
        existing = submittedDoc;
        if (!form.settings.allowResubmit) {
          return res.status(409).send({ message: "이미 응답하셨습니다." });
        }
      } else if (draftDoc) {
        existing = draftDoc;
        promotingDraft = true;
      }
    } else {
      const myRows = await AltSheetRow(req.user.academyId)
        .find({
          form: form._id,
          _respondent: req.user._id,
          ...submittedSheetRowFilter(),
        })
        .select("createdAt _submittedAt _weekdayOccurrenceKey")
        .sort({ createdAt: -1 })
        .lean();
      const requestedOccurrenceKey =
        typeof req.body.weekdayOccurrenceKey === "string"
          ? req.body.weekdayOccurrenceKey
          : null;
      const limitCheck = checkMultipleResponseLimit(
        form,
        myRows,
        new Date(),
        requestedOccurrenceKey
      );
      if (!limitCheck.allowed) {
        return res.status(409).send({ message: limitCheck.message });
      }
    }

    if (existing && !promotingDraft) {
        // 재제출: 기존 행 업데이트
        const respondentFields = form.fields.filter(
          (f) => f.permission === "respondent" && f.type !== "content"
        );
        for (const field of respondentFields) {
          if (field.type !== "docResponse") continue;
          if (!isFieldVisible(field, req.body.data)) continue;
          const fieldId = field._id.toString();
          const value =
            fieldId in req.body.data
              ? req.body.data[fieldId]
              : existing.data.get(fieldId);
          const docError = validateDocResponseField(field, value);
          if (docError) {
            return res.status(400).send({ message: docError });
          }
        }
        for (const field of respondentFields) {
          const fieldId = field._id.toString();
          if (fieldId in req.body.data) {
            existing.data.set(fieldId, req.body.data[fieldId]);
          }
        }

        const rowDataObj =
          existing.data instanceof Map
            ? Object.fromEntries(existing.data)
            : { ...(existing.data || {}) };

        if (form.settings?.quizMode) {
          const quizResult = gradeQuizRow(form, rowDataObj);
          existing.data.set("_quiz_score", quizResult.score);
          existing.data.set("_quiz_total", quizResult.total);
          existing.data.set("_quiz_fieldResults", quizResult.fieldResults);
        }

        if (form.settings?.assessmentMode) {
          const prevAssessment = rowDataObj._assessment || null;
          const assessment = applyAssessmentOnSubmit(
            form,
            rowDataObj,
            prevAssessment
          );
          existing.data.set("_assessment", assessment);
        }

        existing._updatedAt = new Date();
        existing.markModified("data");
        await existing.save();

        return res.status(200).send({ row: existing });
    }

    // respondent 필드만 추출하여 data 구성
    const respondentFields = form.fields.filter(
      (f) => f.permission === "respondent" && f.type !== "content"
    );
    const data = {};
    for (const field of respondentFields) {
      const fieldId = field._id.toString();
      // 조건부 필드: 숨겨진 필드는 null 저장
      if (!isFieldVisible(field, req.body.data)) {
        data[fieldId] = null;
        continue;
      }
      if (fieldId in req.body.data) {
        data[fieldId] = req.body.data[fieldId];
      }
    }

    // 유효성 검사: 보이는 필수 필드 + docResponse 템플릿 수정 여부
    for (const field of respondentFields) {
      if (!isFieldVisible(field, req.body.data)) continue;
      const value = data[field._id.toString()];
      if (field.type === "docResponse") {
        const docError = validateDocResponseField(field, value);
        if (docError) {
          return res.status(400).send({ message: docError });
        }
        continue;
      }
      if (field.type === "aiChat") {
        const targetRowId = req.body.row || null;
        const aiError = await assertAiChatRequiredOnSubmit({
          academyId: req.user.academyId,
          form,
          row: targetRowId ? { _id: targetRowId } : null,
          field,
          visible: true,
          user: req.user,
        });
        if (aiError) {
          return res.status(400).send({ message: aiError });
        }
        continue;
      }
      // 승인·회람: 고정 인원은 아래에서 스냅샷한다.
      if (field.type === "approval" || field.type === "circulation") continue;
      if (!field.required) continue;
      if (value === undefined || value === null || value === "") {
        return res
          .status(400)
          .send({ message: `필수 항목을 입력해주세요: ${field.label}` });
      }
    }

    // 날짜 필드 제한 검사 (date + multiDate)
    for (const field of respondentFields) {
      if (field.type !== "date" && field.type !== "multiDate") continue;
      if (!isFieldVisible(field, req.body.data)) continue;
      const rawValue = data[field._id.toString()];
      if (!rawValue) continue;

      const dates =
        field.type === "multiDate"
          ? Array.isArray(rawValue)
            ? rawValue
            : [rawValue]
          : [rawValue];

      const v = field.validation;
      for (const value of dates) {
        if (v?.minDate && value < v.minDate) {
          return res.status(400).send({
            message: `${field.label}: ${v.minDate} 이후 날짜를 선택해주세요.`,
          });
        }
        if (v?.maxDate && value > v.maxDate) {
          return res.status(400).send({
            message: `${field.label}: ${v.maxDate} 이전 날짜를 선택해주세요.`,
          });
        }
        if (v?.allowedDays && v.allowedDays.length < 7) {
          const day = new Date(value + "T00:00:00").getDay();
          if (!v.allowedDays.includes(day)) {
            return res.status(400).send({
              message: `${field.label}: 해당 요일은 선택할 수 없습니다.`,
            });
          }
        }
        // 시간 윈도우 검사
        if (v?.availableFrom && v?.availableUntil) {
          const now = new Date();
          const nowMs = now.getTime();
          const [fH, fM] = v.availableFrom.split(":").map(Number);
          const [uH, uM] = v.availableUntil.split(":").map(Number);
          const fDays = v.availableFromDays ?? 1;
          const uDays = v.availableUntilDays ?? 0;

          const candidate = new Date(value + "T00:00:00");
          const winStart = new Date(candidate);
          winStart.setDate(winStart.getDate() - fDays);
          winStart.setHours(fH, fM, 0, 0);
          const winEnd = new Date(candidate);
          winEnd.setDate(winEnd.getDate() + uDays);
          winEnd.setHours(uH, uM, 0, 0);

          if (nowMs < winStart.getTime() || nowMs > winEnd.getTime()) {
            return res.status(400).send({
              message: `${field.label}: 현재 시간에 선택할 수 없는 날짜입니다.`,
            });
          }
        }
      }
    }

    // counter 필드 검사
    for (const field of form.fields) {
      if (field.type !== "counter") continue;
      const maxCount = field.validation?.maxCount;
      if (!maxCount) continue;
      const currentCount = await AltSheetRow(req.user.academyId).countDocuments({
        form: form._id,
        ...submittedSheetRowFilter(),
      });
      if (currentCount >= maxCount) {
        return res.status(409).send({ message: "정원이 마감되었습니다." });
      }
    }

    // 중복 검사
    let claimedCounterKeys = [];
    const dupFields = getDuplicateCheckFields(form);
    if (dupFields.length > 0) {
      const dupMode = dupFields[0].duplicateCheck?.mode || "free";
      const allowedCount = dupFields[0].duplicateCheck?.allowedCount || 1;

      // multiDate 필드 찾기 (toObject로 Mongoose type 프로퍼티 우회)
      const fieldTypeMap = new Map(
        form.fields.map((f) => [
          f._id.toString(),
          f.toObject ? f.toObject().type : f.type,
        ])
      );
      const multiDateDupField = dupFields.find(
        (df) => fieldTypeMap.get(df._id.toString()) === "multiDate"
      );

      // 중복 검사 쿼리에 사용할 값 가져오기
      const getDupValue = (fieldId) =>
        data[fieldId] ?? req.body.data?.[fieldId];

      // 기본 쿼리 빌더 (multiDate 필드 제외, 배열은 $in으로 요소별 매칭)
      const buildBaseQuery = () => {
        const q = { form: form._id, ...submittedSheetRowFilter() };
        const mdId = multiDateDupField?._id?.toString();
        for (const df of dupFields) {
          const fieldId = df._id.toString();
          if (mdId && fieldId === mdId) continue;
          const val = getDupValue(fieldId);
          // 배열(multiSelect 등)은 요소 중 하나라도 겹치면 중복으로 판정
          q[`data.${fieldId}`] = Array.isArray(val) ? { $in: val } : val;
        }
        return q;
      };

      if (multiDateDupField) {
        // === multiDate 중복 검사: 각 날짜를 개별로 처리 ===
        const mdFieldId = multiDateDupField._id.toString();
        const rawDates = getDupValue(mdFieldId);
        const dates = Array.isArray(rawDates) ? rawDates : [rawDates];

        if (dupMode === "preRegistration") {
          const claimedSlots = [];
          for (const singleDate of dates) {
            if (!singleDate) continue;
            const slotQuery = {
              ...buildBaseQuery(),
              [`data.${mdFieldId}`]: singleDate,
              _respondent: null,
            };
            const now = new Date();
            const emptySlot = await AltSheetRow(
              req.user.academyId
            ).findOneAndUpdate(
              slotQuery,
              {
                $set: {
                  _respondent: req.user._id,
                  _respondentId: req.user.userId,
                  _respondentName: req.user.userName,
                  _submittedAt: now,
                  _updatedAt: now,
                  ...Object.fromEntries(
                    respondentFields
                      .filter((f) => !f.duplicateCheck?.enabled)
                      .map((f) => [
                        `data.${f._id.toString()}`,
                        data[f._id.toString()],
                      ])
                  ),
                },
              },
              { new: true }
            );
            if (!emptySlot) {
              return res.status(409).send({
                message: `선택한 조합이 이미 마감되었습니다. (${singleDate})`,
              });
            }
            claimedSlots.push(emptySlot);
          }
          if (promotingDraft && existing) {
            await existing.deleteOne();
          }
          return res.status(200).send({ row: claimedSlots[0] });
        } else {
          // 자유 모드: atomic 카운터로 각 날짜 중복 검사
          const keys = buildDupCounterKeys(dupFields, getDupValue, multiDateDupField);
          for (const key of keys) {
            const claimed = await claimDupCounter(
              req.user.academyId, form._id, key, allowedCount
            );
            if (!claimed) {
              await rollbackDupCounters(req.user.academyId, form._id, claimedCounterKeys);
              const keyObj = JSON.parse(key);
              const failedDate = keyObj[multiDateDupField._id.toString()];
              return res.status(409).send({
                message: `이미 선택된 조합입니다. (${failedDate})`,
              });
            }
            claimedCounterKeys.push(key);
          }
        }
      } else if (dupMode === "preRegistration") {
        // === 사전 등록 모드 (단일 값) ===
        const dupQuery = buildBaseQuery();
        const now = new Date();
        const emptySlot = await AltSheetRow(
          req.user.academyId
        ).findOneAndUpdate(
          { ...dupQuery, _respondent: null },
          {
            $set: {
              _respondent: req.user._id,
              _respondentId: req.user.userId,
              _respondentName: req.user.userName,
              _submittedAt: now,
              _updatedAt: now,
              ...Object.fromEntries(
                respondentFields
                  .filter((f) => !f.duplicateCheck?.enabled)
                  .map((f) => [
                    `data.${f._id.toString()}`,
                    data[f._id.toString()],
                  ])
              ),
            },
          },
          { new: true }
        );

        if (!emptySlot) {
          return res
            .status(409)
            .send({ message: "선택한 조합이 이미 마감되었습니다." });
        }

        // 퀴즈 채점 (사전 등록 모드)
        if (form.settings?.quizMode) {
          const quizResult = gradeQuizRow(
            form,
            emptySlot.data instanceof Map
              ? Object.fromEntries(emptySlot.data)
              : emptySlot.data
          );
          emptySlot.data.set("_quiz_score", quizResult.score);
          emptySlot.data.set("_quiz_total", quizResult.total);
          emptySlot.data.set("_quiz_fieldResults", quizResult.fieldResults);
          emptySlot.markModified("data");
          await emptySlot.save();
        }

        // 평가 모드 (사전 등록 슬롯 클레임)
        if (form.settings?.assessmentMode) {
          const slotData =
            emptySlot.data instanceof Map
              ? Object.fromEntries(emptySlot.data)
              : emptySlot.data || {};
          const assessment = applyAssessmentOnSubmit(form, slotData, null);
          emptySlot.data.set("_assessment", assessment);
          emptySlot.markModified("data");
          await emptySlot.save();
        }

        if (promotingDraft && existing) {
          await existing.deleteOne();
        }

        return res.status(200).send({ row: emptySlot });
      } else {
        // === 자유 모드 (단일 값): atomic 카운터 ===
        const keys = buildDupCounterKeys(dupFields, getDupValue, null);
        for (const key of keys) {
          const claimed = await claimDupCounter(
            req.user.academyId, form._id, key, allowedCount
          );
          if (!claimed) {
            await rollbackDupCounters(req.user.academyId, form._id, claimedCounterKeys);
            return res
              .status(409)
              .send({ message: "이미 선택된 조합입니다." });
          }
          claimedCounterKeys.push(key);
        }
      }
    }

    const now = new Date();
    let occurrenceKeyToStamp;
    if (isWeekdayScheduleEnabled(form)) {
      if (existing?._weekdayOccurrenceKey) {
        occurrenceKeyToStamp = existing._weekdayOccurrenceKey;
      } else {
        const submittedForOcc = await AltSheetRow(req.user.academyId)
          .find({
            form: form._id,
            _respondent: req.user._id,
            isActive: true,
            ...submittedSheetRowFilter(),
          })
          .select("createdAt _submittedAt _weekdayOccurrenceKey isDraft")
          .lean();
        const resolved = resolveOccurrenceKey(
          form,
          now,
          typeof req.body.weekdayOccurrenceKey === "string"
            ? req.body.weekdayOccurrenceKey
            : null,
          submittedForOcc
        );
        if (resolved.error) {
          return res.status(403).send({ message: resolved.error });
        }
        occurrenceKeyToStamp = resolved.occurrence?.key;
      }
    }
    const rowData = { ...data };

    // 승인(결재선) 필드: 제출값 검증·v2 초기화
    for (const field of form.fields) {
      if (field.type !== "approval") continue;
      const fid = field._id.toString();
      const errMsg = validateApprovalSubmit(field, rowData[fid]);
      if (errMsg) {
        return res.status(400).send({ message: errMsg });
      }
      const built = buildApprovalOnSubmit(field, rowData[fid]);
      if (built) rowData[fid] = built;
    }

    for (const field of form.fields) {
      if (field.type !== "circulation") continue;
      const fid = field._id.toString();
      const errMsg = validateCirculationSubmit(field, rowData[fid]);
      if (errMsg) {
        return res.status(400).send({ message: errMsg });
      }
      rowData[fid] = buildCirculationOnSubmit(field, rowData[fid]);
    }

    // 퀴즈 자동 채점
    if (form.settings?.quizMode) {
      const quizResult = gradeQuizRow(form, rowData);
      rowData._quiz_score = quizResult.score;
      rowData._quiz_total = quizResult.total;
      rowData._quiz_fieldResults = quizResult.fieldResults;
    }

    // 평가 모드: completion 초안 + draft
    if (form.settings?.assessmentMode) {
      rowData._assessment = applyAssessmentOnSubmit(form, rowData, null);
    }

    let row;
    try {
      if (promotingDraft && existing) {
        for (const [key, value] of Object.entries(rowData)) {
          existing.data.set(key, value);
        }
        existing.isDraft = false;
        existing._submittedAt = now;
        existing._updatedAt = now;
        if (occurrenceKeyToStamp) {
          existing._weekdayOccurrenceKey = occurrenceKeyToStamp;
        }
        existing.markModified("data");
        await existing.save();
        row = existing;
      } else {
        row = await AltSheetRow(req.user.academyId).create({
          sheet: form.sheet,
          form: form._id,
          board: form.board,
          _respondent: req.user._id,
          _respondentId: req.user.userId,
          _respondentName: req.user.userName,
          data: rowData,
          isDraft: false,
          _submittedAt: now,
          _updatedAt: now,
          ...(occurrenceKeyToStamp
            ? { _weekdayOccurrenceKey: occurrenceKeyToStamp }
            : {}),
        });
      }
    } catch (createErr) {
      // Row 생성 실패 시 카운터 롤백
      if (claimedCounterKeys.length > 0) {
        await rollbackDupCounters(req.user.academyId, form._id, claimedCounterKeys);
      }
      throw createErr;
    }

    // 현재 단계 승인자에게 알림
    const approvalNotifEnabled = await isBoardNotificationEnabled(
      req.user.academyId,
      board.school,
      board,
      "altFormApprovalRequest"
    );
    if (approvalNotifEnabled) {
      const skipCirculationIds = new Set();
      for (const field of form.fields) {
        if (field.type !== "approval") continue;
        const approvalData = normalizeApprovalValue(
          rowData[field._id.toString()],
          field
        );
        const approver = approvalData?.steps?.[0]?.approver;
        if (approver?.user) {
          if (approver.userId) skipCirculationIds.add(approver.userId);
          try {
            await sendAutoNotification({
              academyId: req.user.academyId,
              toUserList: [approver],
              notificationType: "altFormApprovalRequest",
              category: "Alt Board",
              title: `${form.title} - 승인 요청`,
              description: `${req.user.userName}님이 「${approvalData.steps[0].label}」승인을 요청했습니다.`,
              relatedEntity: { type: "altSheetRow", id: row._id },
              fromUser: req.user,
            });
          } catch (e) {
            // 알림 실패는 응답에 영향 없음
          }
        }
      }
      const circulatees = collectStoredCirculatees(form, rowData).filter(
        (u) => u?.user && u.userId && !skipCirculationIds.has(u.userId)
      );
      if (circulatees.length > 0) {
        try {
          await sendAutoNotification({
            academyId: req.user.academyId,
            toUserList: circulatees,
            notificationType: "altFormApprovalRequest",
            category: "Alt Board",
            title: `회람: ${form.title}`,
            description: `${req.user.userName}님이 문서를 회람했습니다.`,
            relatedEntity: { type: "altSheetRow", id: row._id },
            fromUser: req.user,
          });
        } catch (e) {
          // 알림 실패는 응답에 영향 없음
        }
      }
    }

    return res.status(200).send({ row });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).send({ message: "이미 응답하셨습니다." });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function RAltSheetRows API
 * @description Sheet 행 조회 (교사: 전체, 학생: 본인만)
 * @version 1.0.0
 */
export const find = async (req, res) => {
  try {
    if (!("form" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("form") });
    }

    const form = await AltForm(req.user.academyId).findById(req.query.form);
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
    const viewAll = canViewAllRows(form, board, req.user, schoolRole);
    const member = isFormMember(form, board, req.user, schoolRole);
    const viewerRole =
      getFormViewerRole(form, board, req.user, schoolRole) || "respondent";

    // 승인 필드가 있는 경우, 승인자도 접근 허용
    const approvalFieldIds = form.fields
      .filter((f) => f.type === "approval")
      .map((f) => f._id.toString());
    const accessOr = buildApprovalAccessOr(form, req.user.userId);

    if (!member && !role && accessOr.length === 0) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    let query = { form: form._id, ...submittedSheetRowFilter() };

    if (viewAll) {
      // 기록 전체
    } else if (member || role === "respondent") {
      if (form.settings?.shareResponses) {
        // shareResponses 켜짐: 전체 행 열람 가능
      } else if (accessOr.length > 0) {
        query.$or = [
          { _respondent: req.user._id },
          ...accessOr,
        ];
      } else {
        query._respondent = req.user._id;
      }
    } else if (accessOr.length > 0) {
      // 역할 없지만 승인자·회람자로 지정된 행만
      if (accessOr.length === 1) {
        Object.assign(query, accessOr[0]);
      } else {
        query.$or = accessOr;
      }
    } else {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const rows = await AltSheetRow(req.user.academyId)
      .find(query)
      .sort({ createdAt: -1 })
      .lean();

    // respondent/승인자에게는 보이는 필드만 필터링
    if (!viewAll) {
      const visibleFieldIds = new Set(
        getVisibleFields(form.fields, viewerRole).map((f) =>
          f._id.toString()
        )
      );
      // 승인·회람 필드는 지정된 사람에게 항상 표시
      for (const fid of approvalFieldIds) {
        visibleFieldIds.add(fid);
      }
      for (const field of form.fields || []) {
        if (field.type === "circulation") {
          visibleFieldIds.add(field._id.toString());
        }
      }

      // 퀴즈 reveal 설정 처리
      const isQuiz = form.settings?.quizMode;
      const isAssessment = form.settings?.assessmentMode;
      const isClosed =
        form.settings?.closeAt && new Date(form.settings.closeAt) < new Date();
      const scoreVisible = isQuiz && (
        form.settings.quizSettings?.scoreReveal === "immediately" ||
        (form.settings.quizSettings?.scoreReveal === "afterDeadline" && isClosed)
      );
      const answerVisible = isQuiz && (
        form.settings.quizSettings?.answerReveal === "immediately" ||
        (form.settings.quizSettings?.answerReveal === "afterDeadline" && isClosed)
      );

      for (const row of rows) {
        const filteredData = {};
        for (const [key, value] of Object.entries(row.data || {})) {
          if (key.startsWith("_quiz_")) {
            if (key === "_quiz_score" || key === "_quiz_total") {
              if (scoreVisible) filteredData[key] = value;
            } else if (key === "_quiz_fieldResults") {
              if (answerVisible) filteredData[key] = value;
            }
            continue;
          }
          if (key === "_assessment") {
            if (isAssessment) {
              const masked = filterAssessmentForViewer(value, false);
              if (masked) filteredData[key] = masked;
            }
            continue;
          }
          if (visibleFieldIds.has(key)) {
            filteredData[key] = value;
          }
        }
        row.data = filteredData;
      }
    }

    return res.status(200).send({ rows });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function RAltSheetRowMy API
 * @description 내 응답 목록 조회 (최신순) — 개별 보기용
 * @version 1.1.0
 */
export const findMy = async (req, res) => {
  try {
    if (!("form" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("form") });
    }

    const form = await AltForm(req.user.academyId).findById(req.query.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    const role = board ? getAltBoardRole(board, req.user) : null;
    const schoolRole = board
      ? await getUserRoleInSeason(
          req.user.academyId,
          board.schoolId,
          req.user,
          isSeasonScopedBoard(board) ? board.season : null
        )
      : null;
    const canSeeFullAssessment =
      (board && canViewAllRows(form, board, req.user, schoolRole)) ||
      req.user.auth === "manager";

    const rows = await AltSheetRow(req.user.academyId)
      .find({
        form: req.query.form,
        _respondent: req.user._id,
        isActive: true,
      })
      .lean();

    const sorted = sortMyRowsForReview(rows);

    // 평가 모드: 확정 전 결과 마스킹 (본인 조회라도)
    if (form.settings?.assessmentMode && !canSeeFullAssessment) {
      for (const row of sorted) {
        if (row.data?._assessment) {
          row.data._assessment = filterAssessmentForViewer(
            row.data._assessment,
            false
          );
        }
      }
    }

    return res.status(200).send({ rows: sorted });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function UAltSheetRow API
 * @description Sheet 셀 값 수정 (교사: owner 필드 편집)
 * @version 1.0.0
 */
export const update = async (req, res) => {
  try {
    const row = await AltSheetRow(req.user.academyId).findById(req.params._id);
    if (!row || !row.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("row") });
    }
    if (isDraftSheetRow(row)) {
      return res.status(400).send({ message: "저장본은 채점·승인할 수 없습니다." });
    }

    const board = await Board(req.user.academyId).findById(row.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 승인 필드: 현재 단계 승인자 본인도 업데이트 가능
    const form = await AltForm(req.user.academyId).findById(row.form);
    const isApprover = form?.fields.some((f) => {
      if (f.type !== "approval") return false;
      const approvalData =
        row.data?.get?.(f._id.toString()) || row.data?.[f._id.toString()];
      return isCurrentApprover(approvalData, req.user.userId, f);
    });

    const role = getAltBoardRole(board, req.user);
    const isAdmin = role === "admin" || req.user.auth === "manager";

    if (!isAdmin && !isApprover) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (req.body.data) {
      for (const [key, value] of Object.entries(req.body.data)) {
        const field = form?.fields.find((f) => f._id.toString() === key);

        // 승인 필드: 서버에서 순차 결재 적용 (클라이언트가 status만 보내도 됨)
        if (field?.type === "approval" && value?.status && value.status !== "pending") {
          const prev =
            row.data?.get?.(key) || row.data?.[key];
          const result = applyApprovalAction(
            prev,
            field,
            req.user.userId,
            value.status,
            value.reason
          );
          if (!result.ok) {
            // 관리자는 레거시처럼 직접 덮어쓰기 허용(비상)
            if (isAdmin && value.version === 2) {
              row.data.set(key, value);
            } else if (isAdmin && !prev?.version) {
              row.data.set(key, value);
            } else {
              return res.status(403).send({ message: result.message });
            }
          } else {
            row.data.set(key, result.value);

            try {
              if (result.finished && row._respondent) {
                const resultNotifEnabled = await isBoardNotificationEnabled(
                  req.user.academyId,
                  board.school,
                  board,
                  "altFormApprovalResult"
                );
                if (resultNotifEnabled) {
                  await sendAutoNotification({
                    academyId: req.user.academyId,
                    toUserList: [
                      {
                        user: row._respondent,
                        userId: row._respondentId,
                        userName: row._respondentName,
                      },
                    ],
                    notificationType: "altFormApprovalResult",
                    category: "Alt Board",
                    title: `${form.title} - ${
                      result.value.overallStatus === "approved"
                        ? "승인됨"
                        : "반려됨"
                    }`,
                    description: value.reason || "",
                    relatedEntity: { type: "altSheetRow", id: row._id },
                    fromUser: req.user,
                  });
                }
              } else if (!result.finished) {
                // 중간 단계 승인: 제출자에게 진행 알림
                if (row._respondent) {
                  const resultNotifEnabled = await isBoardNotificationEnabled(
                    req.user.academyId,
                    board.school,
                    board,
                    "altFormApprovalResult"
                  );
                  if (resultNotifEnabled) {
                    const actedStep =
                      result.value.steps?.[
                        (result.value.currentStep || 1) - 1
                      ];
                    const nextStep =
                      result.value.steps?.[result.value.currentStep];
                    const actedLabel = actedStep?.label || "이전 단계";
                    const nextLabel = nextStep?.label || "다음";
                    await sendAutoNotification({
                      academyId: req.user.academyId,
                      toUserList: [
                        {
                          user: row._respondent,
                          userId: row._respondentId,
                          userName: row._respondentName,
                        },
                      ],
                      notificationType: "altFormApprovalResult",
                      category: "Alt Board",
                      title: `${form.title} - 「${actedLabel}」승인됨`,
                      description: `다음: 「${nextLabel}」승인 대기`,
                      relatedEntity: { type: "altSheetRow", id: row._id },
                      fromUser: req.user,
                    });
                  }
                }
                // 다음 승인자에게 요청 알림
                if (result.nextApprover?.user) {
                  const reqNotifEnabled = await isBoardNotificationEnabled(
                    req.user.academyId,
                    board.school,
                    board,
                    "altFormApprovalRequest"
                  );
                  if (reqNotifEnabled) {
                    const stepLabel =
                      result.value.steps[result.value.currentStep]?.label ||
                      "다음";
                    await sendAutoNotification({
                      academyId: req.user.academyId,
                      toUserList: [result.nextApprover],
                      notificationType: "altFormApprovalRequest",
                      category: "Alt Board",
                      title: `${form.title} - 승인 요청`,
                      description: `「${stepLabel}」승인이 필요합니다.`,
                      relatedEntity: { type: "altSheetRow", id: row._id },
                      fromUser: req.user,
                    });
                  }
                }
              }
            } catch (e) {
              // 알림 실패는 응답에 영향 없음
            }
          }
        } else {
          row.data.set(key, value);
        }
      }
      row._updatedAt = new Date();
      row.markModified("data");
    }

    await row.save();

    return res.status(200).send({ row });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function DAltSheetRow API
 * @description Sheet 행 삭제 / 응답 철회
 * @version 1.0.0
 */
export const remove = async (req, res) => {
  try {
    const row = await AltSheetRow(req.user.academyId).findById(req.params._id);
    if (!row || !row.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("row") });
    }

    const board = await Board(req.user.academyId).findById(row.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // admin 또는 시스템 manager이거나, 본인 응답 + 응답 수정(삭제 포함) 허용
    const role = getAltBoardRole(board, req.user);
    const isAdmin = role === "admin" || req.user.auth === "manager";
    const isOwner = row._respondent && row._respondent.equals(req.user._id);

    const form = await AltForm(req.user.academyId).findById(row.form);

    if (!isAdmin && !(isOwner && (form?.settings?.allowResubmit || canOwnerDeleteDraft(row, req.user._id)))) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }
    if (form && !isDraftSheetRow(row)) {
      const dupFields = getDuplicateCheckFields(form);
      const dupMode = dupFields[0]?.duplicateCheck?.mode;
      if (dupFields.length > 0 && dupMode === "free") {
        const fieldTypeMap = new Map(
          form.fields.map((f) => [
            f._id.toString(),
            f.toObject ? f.toObject().type : f.type,
          ])
        );
        const multiDateDupField = dupFields.find(
          (df) => fieldTypeMap.get(df._id.toString()) === "multiDate"
        );
        const rowData =
          row.data instanceof Map ? Object.fromEntries(row.data) : row.data;
        const getDupValue = (fieldId) => rowData[fieldId];
        const keys = buildDupCounterKeys(dupFields, getDupValue, multiDateDupField);
        await rollbackDupCounters(req.user.academyId, form._id, keys);
      }
    }

    await row.deleteOne();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function CAltSheetRowsBulk API
 * @description 다중 행 입력 (교사 직접 입력)
 * @version 1.0.0
 */
export const createBulk = async (req, res) => {
  try {
    for (let field of ["form", "rows"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const form = await AltForm(req.user.academyId).findById(req.body.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const schoolRole = await schoolRoleOf(
      req.user.academyId,
      board,
      req.user
    );
    if (!canViewAllRows(form, board, req.user, schoolRole)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const now = new Date();
    const docs = req.body.rows.map((r) => ({
      sheet: form.sheet,
      form: form._id,
      board: form.board,
      _respondent: r._respondent || null,
      _respondentId: r._respondentId || null,
      _respondentName: r._respondentName || null,
      data: r.data || {},
      _submittedAt: now,
      _updatedAt: now,
      isDraft: false,
    }));

    const rows = await AltSheetRow(req.user.academyId).insertMany(docs);

    return res.status(200).send({ rows, created: rows.length });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function RAltSheetRowSubmissionStatus API
 * @description 제출 현황 조회 (관리자용)
 */
export const findSubmissionStatus = async (req, res) => {
  try {
    if (!("form" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("form") });
    }

    const form = await AltForm(req.user.academyId).findById(req.query.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const schoolRole = await schoolRoleOf(
      req.user.academyId,
      board,
      req.user
    );
    if (!canViewAllRows(form, board, req.user, schoolRole)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const respondentOids = [];
    if (isAccessListCustom(form.members) || isAccessListCustom(form.writers)) {
      const memberUsers = await resolveFormMemberUsers(
        req.user.academyId,
        form,
        board
      );
      for (const u of memberUsers) {
        respondentOids.push(String(u.user));
      }
    } else if (board.altBoardRole && board.altBoardRole.size > 0) {
      for (const [userOid, role] of board.altBoardRole.entries()) {
        if (role === "respondent") {
          respondentOids.push(userOid);
        }
      }
    }

    // altBoardRole에 respondent가 없으면 members에서 추출 (writers 제외)
    if (respondentOids.length === 0 && board.members?.users?.length > 0) {
      const writerIds = new Set(
        (board.writers?.users || []).map((u) => u.user.toString())
      );
      for (const u of board.members.users) {
        if (!writerIds.has(u.user.toString())) {
          respondentOids.push(u.user.toString());
        }
      }
    }

    // ObjectIds → User 정보 조회
    const users = await User(req.user.academyId)
      .find({ _id: { $in: respondentOids } })
      .select("_id userId userName")
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    // 제출된 행 목록
    const submittedRows = await AltSheetRow(req.user.academyId)
      .find({
        form: form._id,
        ...submittedSheetRowFilter(),
        _respondent: { $ne: null },
      })
      .select("_respondent _respondentId _respondentName _submittedAt")
      .lean();

    // 대상자 OID 셋 (빠른 검색용)
    const respondentOidSet = new Set(respondentOids.map((oid) => oid.toString()));

    // 고유 사용자별 최신 제출 시각만 표시 (대상자만 포함)
    const submittedMap = new Map();
    for (const r of submittedRows) {
      const key = r._respondent?.toString();
      if (!key || !respondentOidSet.has(key)) continue;
      const existing = submittedMap.get(key);
      if (!existing || new Date(r._submittedAt) > new Date(existing._submittedAt)) {
        submittedMap.set(key, r);
      }
    }

    const submittedSet = new Set(submittedMap.keys());
    const submitted = Array.from(submittedMap.values()).map((r) => ({
      userId: r._respondentId,
      userName: r._respondentName,
      submittedAt: r._submittedAt,
    }));

    const unsubmitted = respondentOids
      .filter((oid) => !submittedSet.has(oid.toString()))
      .map((oid) => {
        const user = userMap.get(oid.toString());
        return {
          userId: user?.userId || oid.toString(),
          userName: user?.userName || "",
        };
      });

    return res.status(200).send({
      total: respondentOids.length,
      submitted,
      unsubmitted,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function CAltSheetRowSendReminder API
 * @description 미제출자에게 알림 발송
 */
export const sendReminder = async (req, res) => {
  try {
    for (let field of ["form", "userIds"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const form = await AltForm(req.user.academyId).findById(req.body.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const schoolRole = await schoolRoleOf(
      req.user.academyId,
      board,
      req.user
    );
    if (!canViewAllRows(form, board, req.user, schoolRole)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const users = await User(req.user.academyId)
      .find({ userId: { $in: req.body.userIds } })
      .select("_id userId userName")
      .lean();

    const toUserList = users.map((u) => ({
      user: u._id,
      userId: u.userId,
      userName: u.userName,
    }));

    if (toUserList.length === 0) {
      return res.status(200).send({ sent: 0 });
    }

    await sendAutoNotification({
      academyId: req.user.academyId,
      toUserList,
      notificationType: "reminder",
      category: "Alt Board",
      title: `${form.title} - 응답 요청`,
      description: `아직 응답하지 않은 양식이 있습니다.`,
      relatedEntity: { type: "altForm", id: form._id },
      fromUser: req.user,
    });

    return res.status(200).send({ sent: toUserList.length });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function RAltSheetRowCount API
 * @description Form 응답 수 조회 (counter 필드용)
 */
export const findCount = async (req, res) => {
  try {
    if (!("form" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("form") });
    }

    const count = await AltSheetRow(req.user.academyId).countDocuments({
      form: req.query.form,
      ...submittedSheetRowFilter(),
      _respondent: { $ne: null },
    });

    return res.status(200).send({ count });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function RAltSheetRowAvailableCombinations API
 * @description 중복 검사 - 사용 가능한 조합 조회 (캐스케이딩 필터용)
 */
export const findAvailableCombinations = async (req, res) => {
  try {
    if (!("form" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("form") });
    }

    const form = await AltForm(req.user.academyId).findById(req.query.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const dupFields = getDuplicateCheckFields(form);
    if (dupFields.length === 0) {
      return res.status(200).send({ combinations: [] });
    }

    // 필터 조건 구성
    const query = { form: form._id, ...submittedSheetRowFilter() };
    const filters = req.query.filters || {};
    for (const [fieldId, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") {
        query[`data.${fieldId}`] = value;
      }
    }

    // 사전 등록 모드: 빈 슬롯(respondent=null) 기준
    const mode = dupFields[0].duplicateCheck?.mode || "free";
    const allowedCount = dupFields[0].duplicateCheck?.allowedCount || 1;

    if (mode === "preRegistration") {
      // 모든 행 조회
      const allRows = await AltSheetRow(req.user.academyId)
        .find(query)
        .lean();

      // 조합별 그룹화
      const combMap = new Map();
      for (const row of allRows) {
        const key = dupFields
          .map((f) => String(row.data?.[f._id.toString()] ?? ""))
          .join("||");
        if (!combMap.has(key)) {
          combMap.set(key, {
            values: Object.fromEntries(
              dupFields.map((f) => [
                f._id.toString(),
                row.data?.[f._id.toString()],
              ])
            ),
            total: 0,
            filled: 0,
          });
        }
        const entry = combMap.get(key);
        entry.total++;
        if (row._respondent) entry.filled++;
      }

      const combinations = Array.from(combMap.values()).map((c) => ({
        values: c.values,
        availableCount: c.total - c.filled,
      }));

      return res.status(200).send({ combinations });
    } else {
      // 자유 모드: 기존 사용량 조회
      const rows = await AltSheetRow(req.user.academyId).find(query).lean();
      const combMap = new Map();
      for (const row of rows) {
        const key = dupFields
          .map((f) => String(row.data?.[f._id.toString()] ?? ""))
          .join("||");
        combMap.set(key, (combMap.get(key) || 0) + 1);
      }

      const combinations = Array.from(combMap.entries()).map(
        ([key, count]) => ({
          values: Object.fromEntries(
            key.split("||").map((v, i) => [dupFields[i]._id.toString(), v])
          ),
          availableCount: Math.max(0, allowedCount - count),
        })
      );

      return res.status(200).send({ combinations });
    }
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function CAltSheetRowImportCsv API
 * @description CSV 데이터 가져오기
 */
export const importCsv = async (req, res) => {
  try {
    for (let field of ["form", "rows"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const form = await AltForm(req.user.academyId).findById(req.body.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const board = await Board(req.user.academyId).findById(form.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const schoolRole = await schoolRoleOf(
      req.user.academyId,
      board,
      req.user
    );
    if (!canViewAllRows(form, board, req.user, schoolRole)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 라벨 → 필드 매핑 (타입별 CSV 값 정규화)
    const labelToField = {};
    for (const field of form.fields) {
      labelToField[field.label] = field;
    }

    const now = new Date();
    const docs = req.body.rows.map((row) => {
      const data = {};
      for (const [label, value] of Object.entries(row)) {
        const field = labelToField[label];
        if (field) {
          data[field._id.toString()] = coerceFieldValueFromCsv(value, field);
        }
      }
      return {
        sheet: form.sheet,
        form: form._id,
        board: form.board,
        data,
        _submittedAt: now,
        _updatedAt: now,
        isDraft: false,
      };
    });

    const rows = await AltSheetRow(req.user.academyId).insertMany(docs);

    return res.status(200).send({ rows, created: rows.length });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function RAltSheetRowPendingApprovals API
 * @description 보드에서 내가 승인해야 할 행 + 내가 제출해 승인 대기 중인 행
 */
export const findPendingApprovals = async (req, res) => {
  try {
    if (!("board" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("board") });
    }

    const board = await Board(req.user.academyId).findById(req.query.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const forms = await AltForm(req.user.academyId)
      .find({ board: board._id, isActive: true, isDraft: { $ne: true } })
      .lean();

    const items = [];
    const outgoing = [];

    for (const form of forms) {
      const approvalFields = (form.fields || []).filter(
        (f) => f.type === "approval"
      );
      if (approvalFields.length === 0) continue;

      const fieldIds = approvalFields.map((f) => f._id.toString());
      const orConds = fieldIds.flatMap((fid) => [
        { [`data.${fid}.currentApproverUserId`]: req.user.userId },
        { [`data.${fid}.approver.userId`]: req.user.userId },
      ]);

      const rows = await AltSheetRow(req.user.academyId)
        .find({
          form: form._id,
          ...submittedSheetRowFilter(),
          $or: orConds,
        })
        .sort({ _submittedAt: -1 })
        .limit(100)
        .lean();

      for (const row of rows) {
        for (const field of approvalFields) {
          const fid = field._id.toString();
          const raw = row.data?.[fid];
          if (!isCurrentApprover(raw, req.user.userId, field)) continue;
          const normalized = normalizeApprovalValue(raw, field);
          items.push({
            rowId: row._id,
            formId: form._id,
            formTitle: form.title,
            fieldId: fid,
            fieldLabel: field.label,
            stepLabel: normalized?.steps?.[normalized.currentStep]?.label,
            respondentName: row._respondentName,
            respondentId: row._respondentId,
            submittedAt: row._submittedAt || row.createdAt,
            approval: normalized,
            rowData: row.data,
            fields: form.fields,
          });
        }
      }

      // 내가 제출했고 아직 승인 진행 중인 행
      const myRows = await AltSheetRow(req.user.academyId)
        .find({
          form: form._id,
          ...submittedSheetRowFilter(),
          _respondent: req.user._id,
        })
        .sort({ _submittedAt: -1 })
        .limit(100)
        .lean();

      for (const row of myRows) {
        for (const field of approvalFields) {
          const fid = field._id.toString();
          const raw = row.data?.[fid];
          // 내가 현재 승인해야 하는 건은 items 쪽에만 표시
          if (isCurrentApprover(raw, req.user.userId, field)) continue;
          const normalized = normalizeApprovalValue(raw, field);
          if (!normalized || normalized.overallStatus !== "pending") continue;
          const step = normalized.steps?.[normalized.currentStep];
          outgoing.push({
            rowId: row._id,
            formId: form._id,
            formTitle: form.title,
            fieldId: fid,
            fieldLabel: field.label,
            stepLabel: step?.label,
            currentApproverName: step?.approver?.userName,
            currentApproverId: step?.approver?.userId,
            currentStep:
              typeof normalized.currentStep === "number"
                ? normalized.currentStep
                : 0,
            totalSteps: normalized.steps?.length || 0,
            submittedAt: row._submittedAt || row.createdAt,
            approval: normalized,
            rowData: row.data,
            fields: form.fields,
          });
        }
      }
    }

    items.sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    outgoing.sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    return res.status(200).send({
      items,
      outgoing,
      count: items.length + outgoing.length,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function RAltSheetRowSchoolTodos API
 * @description 학교 내 가입 Alt Board의 전역 할 일 (승인·승인진행·미제출)
 */
export const findSchoolTodos = async (req, res) => {
  try {
    if (!("school" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("school") });
    }

    const school = await School(req.user.academyId).findById(req.query.school);
    if (!school) {
      return res.status(404).send({ message: __NOT_FOUND("school") });
    }

    const currentSeasonId = req.query.season || null;
    const { items, count } = await getSchoolTodosForUser(
      req.user.academyId,
      school,
      req.user,
      currentSeasonId
    );

    return res.status(200).send({ items, count });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function RAltSheetRow API
 * @description 행 단건 조회 (알림 딥링크용)
 */
export const findById = async (req, res) => {
  try {
    const row = await AltSheetRow(req.user.academyId)
      .findById(req.params._id)
      .lean();
    if (!row || !row.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("row") });
    }

    const board = await Board(req.user.academyId).findById(row.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const form = await AltForm(req.user.academyId).findById(row.form).lean();
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }

    const role = getAltBoardRole(board, req.user);
    const isAdmin = role === "admin" || role === "writer" || req.user.auth === "manager";
    const isOwner =
      row._respondent && String(row._respondent) === String(req.user._id);

    if (isDraftSheetRow(row) && !isOwner) {
      return res.status(404).send({ message: __NOT_FOUND("row") });
    }

    const approvalFields = (form.fields || []).filter((f) => f.type === "approval");
    const isApprover = approvalFields.some((f) =>
      isCurrentApprover(row.data?.[f._id.toString()], req.user.userId, f)
    );
    // 과거 승인자(이미 처리한 단계)도 딥링크 허용
    const wasApprover = approvalFields.some((f) => {
      const raw = row.data?.[f._id.toString()];
      const v = normalizeApprovalValue(raw, f);
      if (!v?.steps) {
        return raw?.approver?.userId === req.user.userId;
      }
      return v.steps.some((s) => s.approver?.userId === req.user.userId);
    });
    const wasCirculatee =
      approvalFields.some((f) => {
        const raw = row.data?.[f._id.toString()];
        const v = normalizeApprovalValue(raw, f);
        return isCirculatee(v || raw, req.user.userId);
      }) || isStoredCirculatee(form, row.data, req.user.userId);

    if (!isAdmin && !isOwner && !isApprover && !wasApprover && !wasCirculatee) {
      if (form.settings?.shareResponses && role === "respondent") {
        // ok
      } else {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    }

    // 평가 결과 마스킹 (관리자 외 + 미확정)
    if (
      form.settings?.assessmentMode &&
      !isAdmin &&
      row.data?._assessment
    ) {
      row.data._assessment = filterAssessmentForViewer(
        row.data._assessment,
        false
      );
    }

    return res.status(200).send({
      row,
      boardId: board._id,
      formId: form._id,
      formTitle: form.title,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AltSheetRowAPI
 * @function UAltSheetRowAssessment API
 * @description 평가 모드 채점·확정/확정취소
 */
export const updateAssessment = async (req, res) => {
  try {
    const row = await AltSheetRow(req.user.academyId).findById(req.params._id);
    if (!row || !row.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("row") });
    }
    if (isDraftSheetRow(row)) {
      return res.status(400).send({ message: "저장본은 채점할 수 없습니다." });
    }

    const form = await AltForm(req.user.academyId).findById(row.form);
    if (!form || !form.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }
    if (!form.settings?.assessmentMode) {
      return res.status(400).send({ message: "평가 모드가 아닌 양식입니다." });
    }

    const board = await Board(req.user.academyId).findById(row.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const schoolRole = await schoolRoleOf(
      req.user.academyId,
      board,
      req.user
    );
    if (
      !canViewAllRows(form, board, req.user, schoolRole) &&
      req.user.auth !== "manager"
    ) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const grader = {
      user: req.user._id?.toString?.() || String(req.user._id),
      userId: req.user.userId,
      userName: req.user.userName,
    };

    let assessment =
      row.data?.get?.("_assessment") || row.data?._assessment || {
        byField: {},
        final: { status: "draft" },
      };

    if (req.body.unfinalize) {
      assessment = unfinalizeAssessment(assessment);
      assessment = recomputeAssessmentTotals(form, assessment);
    } else if (req.body.finalize) {
      // 확정 직전 채점 패치 허용
      if (req.body.byField || req.body.final) {
        assessment = applyAssessmentGradePatch(
          form,
          assessment,
          { byField: req.body.byField, final: req.body.final },
          grader
        );
      }
      const result = finalizeAssessment(form, assessment, grader);
      if (!result.ok) {
        return res.status(400).send({ message: result.message });
      }
      assessment = result.assessment;
    } else {
      assessment = applyAssessmentGradePatch(
        form,
        assessment,
        { byField: req.body.byField, final: req.body.final },
        grader
      );
    }

    row.data.set("_assessment", assessment);
    row._updatedAt = new Date();
    row.markModified("data");
    await row.save();

    return res.status(200).send({ row, assessment });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
