/**
 * AltSheetRowAPI namespace
 * @namespace APIs.AltSheetRowAPI
 * @see TAltSheetRow in {@link Models.AltSheetRow}
 */
import { logger } from "../log/logger.js";
import { AltForm, AltFormDupCounter, AltSheet, AltSheetRow, Board, User } from "../models/index.js";
import {
  getAltBoardRole,
  canManageForm,
  canRespondForm,
  getVisibleFields,
  isFieldVisible,
  gradeQuizRow,
  getDuplicateCheckFields,
  buildDupCounterKeys,
} from "../services/altForms.js";
import { sendAutoNotification, isBoardNotificationEnabled } from "../services/notifications.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

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
 * @memberof APIs.AltSheetRowAPI
 * @function CAltSheetRow API
 * @description Form 응답 제출 (= Sheet에 행 추가)
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

    // 응답 권한 + 공개 기간 확인
    const respondCheck = canRespondForm(form, board, req.user);
    if (!respondCheck.allowed) {
      return res.status(403).send({ message: respondCheck.message });
    }

    // 기존 응답 확인 (복수 응답 허용 시 건너뜀)
    if (!form.settings.allowMultipleResponses) {
      const existing = await AltSheetRow(req.user.academyId).findOne({
        form: form._id,
        _respondent: req.user._id,
        isActive: true,
      });

      if (existing) {
        if (!form.settings.allowResubmit) {
          return res.status(409).send({ message: "이미 응답하셨습니다." });
        }

        // 재제출: 기존 행 업데이트
        const respondentFields = form.fields.filter(
          (f) => f.permission === "respondent"
        );
        for (const field of respondentFields) {
          const fieldId = field._id.toString();
          if (fieldId in req.body.data) {
            existing.data.set(fieldId, req.body.data[fieldId]);
          }
        }
        existing._updatedAt = new Date();
        existing.markModified("data");
        await existing.save();

        return res.status(200).send({ row: existing });
      }
    }

    // respondent 필드만 추출하여 data 구성
    const respondentFields = form.fields.filter(
      (f) => f.permission === "respondent"
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

    // 유효성 검사: 보이는 필수 필드만 확인
    for (const field of respondentFields) {
      if (!field.required) continue;
      if (!isFieldVisible(field, req.body.data)) continue;
      const value = data[field._id.toString()];
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
        isActive: true,
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
        const q = { form: form._id, isActive: true };
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
    const rowData = { ...data };

    // 퀴즈 자동 채점
    if (form.settings?.quizMode) {
      const quizResult = gradeQuizRow(form, data);
      rowData._quiz_score = quizResult.score;
      rowData._quiz_total = quizResult.total;
      rowData._quiz_fieldResults = quizResult.fieldResults;
    }

    let row;
    try {
      row = await AltSheetRow(req.user.academyId).create({
        sheet: form.sheet,
        form: form._id,
        board: form.board,
        _respondent: req.user._id,
        _respondentId: req.user.userId,
        _respondentName: req.user.userName,
        data: rowData,
        _submittedAt: now,
        _updatedAt: now,
      });
    } catch (createErr) {
      // Row 생성 실패 시 카운터 롤백
      if (claimedCounterKeys.length > 0) {
        await rollbackDupCounters(req.user.academyId, form._id, claimedCounterKeys);
      }
      throw createErr;
    }

    // approval 필드가 있으면 승인자에게 알림
    const approvalNotifEnabled = await isBoardNotificationEnabled(
      req.user.academyId,
      board.school,
      board,
      "altFormApprovalRequest"
    );
    if (approvalNotifEnabled) {
      for (const field of form.fields) {
        if (field.type !== "approval") continue;
        const approvalData = data[field._id.toString()];
        if (approvalData?.approver?.user) {
          try {
            await sendAutoNotification({
              academyId: req.user.academyId,
              toUserList: [approvalData.approver],
              notificationType: "altFormApprovalRequest",
              category: "Alt Board",
              title: `${form.title} - 승인 요청`,
              description: `${req.user.userName}님이 승인을 요청했습니다.`,
              relatedEntity: { type: "altSheetRow", id: row._id },
              fromUser: req.user,
            });
          } catch (e) {
            // 알림 실패는 응답에 영향 없음
          }
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

    // 승인 필드가 있는 경우, 승인자도 접근 허용
    const approvalFieldIds = form.fields
      .filter((f) => f.type === "approval")
      .map((f) => f._id.toString());

    if (!role && approvalFieldIds.length === 0) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    let query = { form: form._id, isActive: true };

    if (role === "admin" || role === "writer") {
      // admin/writer: 전체 행
    } else if (role === "respondent") {
      if (form.settings?.shareResponses) {
        // shareResponses 켜짐: 전체 행 열람 가능
      } else if (approvalFieldIds.length > 0) {
        // respondent: 본인 행 + 승인자로 지정된 행
        const approverConditions = approvalFieldIds.map((fid) => ({
          [`data.${fid}.approver.userId`]: req.user.userId,
        }));
        query.$or = [{ _respondent: req.user._id }, ...approverConditions];
      } else {
        query._respondent = req.user._id;
      }
    } else if (approvalFieldIds.length > 0) {
      // 역할 없지만 승인자로 지정된 행만
      const approverConditions = approvalFieldIds.map((fid) => ({
        [`data.${fid}.approver.userId`]: req.user.userId,
      }));
      if (approverConditions.length === 1) {
        Object.assign(query, approverConditions[0]);
      } else {
        query.$or = approverConditions;
      }
    } else {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const rows = await AltSheetRow(req.user.academyId)
      .find(query)
      .sort({ createdAt: -1 })
      .lean();

    // respondent/승인자에게는 보이는 필드만 필터링
    if (role !== "admin" && role !== "writer") {
      const visibleFieldIds = new Set(
        getVisibleFields(form.fields, role || "respondent").map((f) =>
          f._id.toString()
        )
      );
      // 승인 필드는 승인자에게 항상 표시
      for (const fid of approvalFieldIds) {
        visibleFieldIds.add(fid);
      }

      // 퀴즈 reveal 설정 처리
      const isQuiz = form.settings?.quizMode;
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
        for (const [key, value] of Object.entries(row.data)) {
          if (key.startsWith("_quiz_")) {
            if (key === "_quiz_score" || key === "_quiz_total") {
              if (scoreVisible) filteredData[key] = value;
            } else if (key === "_quiz_fieldResults") {
              if (answerVisible) filteredData[key] = value;
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
 * @description 내 응답 조회
 * @version 1.0.0
 */
export const findMy = async (req, res) => {
  try {
    if (!("form" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("form") });
    }

    const row = await AltSheetRow(req.user.academyId).findOne({
      form: req.query.form,
      _respondent: req.user._id,
      isActive: true,
    });

    return res.status(200).send({ row: row || null });
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

    const board = await Board(req.user.academyId).findById(row.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    // 승인 필드: 승인자 본인도 업데이트 가능
    const form = await AltForm(req.user.academyId).findById(row.form);
    const isApprover = form?.fields.some((f) => {
      if (f.type !== "approval") return false;
      const approvalData = row.data?.get?.(f._id.toString()) || row.data?.[f._id.toString()];
      return approvalData?.approver?.userId === req.user.userId;
    });

    const role = getAltBoardRole(board, req.user);
    const isAdmin = role === "admin" || req.user.auth === "manager";

    if (!isAdmin && !isApprover) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (req.body.data) {
      for (const [key, value] of Object.entries(req.body.data)) {
        row.data.set(key, value);

        // 승인 상태 변경 시 응답자에게 알림
        if (form) {
          const field = form.fields.find((f) => f._id.toString() === key);
          if (
            field?.type === "approval" &&
            value?.status &&
            value.status !== "pending" &&
            row._respondent
          ) {
            try {
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
                  title: `${form.title} - ${value.status === "approved" ? "승인됨" : "반려됨"}`,
                  description: value.reason || "",
                  relatedEntity: { type: "altSheetRow", id: row._id },
                  fromUser: req.user,
                });
              }
            } catch (e) {
              // 알림 실패는 응답에 영향 없음
            }
          }
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

    // admin 또는 시스템 manager이거나 본인 응답 철회 (재제출 허용 시에만)
    const role = getAltBoardRole(board, req.user);
    const isAdmin = role === "admin" || req.user.auth === "manager";
    const isOwner = row._respondent && row._respondent.equals(req.user._id);

    const form = await AltForm(req.user.academyId).findById(row.form);
    const allowResubmit =
      form?.settings?.allowResubmit || form?.settings?.allowMultipleResponses;

    if (!isAdmin && !(isOwner && allowResubmit)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }
    if (form) {
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

    if (!canManageForm(board, req.user)) {
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

    if (!canManageForm(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 응답자 목록: altBoardRole에서 respondent 추출, 없으면 members에서 추출
    const respondentOids = [];
    if (board.altBoardRole && board.altBoardRole.size > 0) {
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
      .find({ form: form._id, isActive: true, _respondent: { $ne: null } })
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

    if (!canManageForm(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const toUserList = req.body.userIds.map((userId) => ({ userId }));

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
      isActive: true,
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
    const query = { form: form._id, isActive: true };
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

    if (!canManageForm(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 라벨 → 필드 ID 매핑
    const labelToFieldId = {};
    for (const field of form.fields) {
      labelToFieldId[field.label] = field._id.toString();
    }

    const now = new Date();
    const docs = req.body.rows.map((row) => {
      const data = {};
      for (const [label, value] of Object.entries(row)) {
        const fieldId = labelToFieldId[label];
        if (fieldId) {
          data[fieldId] = value;
        }
      }
      return {
        sheet: form.sheet,
        form: form._id,
        board: form.board,
        data,
        _submittedAt: now,
        _updatedAt: now,
      };
    });

    const rows = await AltSheetRow(req.user.academyId).insertMany(docs);

    return res.status(200).send({ rows, created: rows.length });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
