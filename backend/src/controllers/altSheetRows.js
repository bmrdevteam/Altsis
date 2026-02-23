/**
 * AltSheetRowAPI namespace
 * @namespace APIs.AltSheetRowAPI
 * @see TAltSheetRow in {@link Models.AltSheetRow}
 */
import { logger } from "../log/logger.js";
import { AltForm, AltSheet, AltSheetRow, Board } from "../models/index.js";
import {
  getAltBoardRole,
  canManageForm,
  canRespondForm,
  getVisibleFields,
} from "../services/altForms.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

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

    // 기존 응답 확인
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

    // 유효성 검사: 필수 필드 확인
    const respondentFields = form.fields.filter(
      (f) => f.permission === "respondent"
    );
    for (const field of respondentFields) {
      if (!field.required) continue;
      const value = req.body.data[field._id.toString()];
      if (value === undefined || value === null || value === "") {
        return res
          .status(400)
          .send({ message: `필수 항목을 입력해주세요: ${field.label}` });
      }
    }

    // respondent 필드만 추출하여 data 구성
    const data = {};
    for (const field of respondentFields) {
      const fieldId = field._id.toString();
      if (fieldId in req.body.data) {
        data[fieldId] = req.body.data[fieldId];
      }
    }

    const now = new Date();
    const row = await AltSheetRow(req.user.academyId).create({
      sheet: form.sheet,
      form: form._id,
      board: form.board,
      _respondent: req.user._id,
      _respondentId: req.user.userId,
      _respondentName: req.user.userName,
      data,
      _submittedAt: now,
      _updatedAt: now,
    });

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
    if (!role) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    let query = { form: form._id, isActive: true };

    // respondent는 본인 행만
    if (role === "respondent") {
      query._respondent = req.user._id;
    }

    const rows = await AltSheetRow(req.user.academyId)
      .find(query)
      .sort({ createdAt: -1 })
      .lean();

    // respondent에게는 보이는 필드만 필터링
    if (role === "respondent") {
      const visibleFieldIds = new Set(
        getVisibleFields(form.fields, role).map((f) => f._id.toString())
      );
      for (const row of rows) {
        const filteredData = {};
        for (const [key, value] of Object.entries(row.data)) {
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

    if (!canManageForm(board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (req.body.data) {
      for (const [key, value] of Object.entries(req.body.data)) {
        row.data.set(key, value);
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

    // 교사(admin/writer)이거나 본인 응답 철회
    const role = getAltBoardRole(board, req.user);
    const isOwner = row._respondent && row._respondent.equals(req.user._id);

    if (role !== "admin" && role !== "writer" && !isOwner) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    row.isActive = false;
    await row.save();

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
