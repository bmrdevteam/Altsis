import {
  Season,
  Form,
  Registration,
  Post,
  Board,
} from "../models/index.js";
import { PERMISSION_DENIED, __NOT_FOUND } from "../messages/index.js";
import { isSchoolManager } from "../utils/schoolManager.js";

/**
 * 실패 시 403을 보내고 true.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {unknown} schoolId
 * @returns {boolean}
 */
export const denyUnlessSchoolManager = (req, res, schoolId) => {
  if (!isSchoolManager(req.user, schoolId)) {
    res.status(403).send({ message: PERMISSION_DENIED });
    return true;
  }
  return false;
};

export const assertSchoolManager = (req, schoolId) =>
  isSchoolManager(req.user, schoolId);

const sendDenied = (res) =>
  res.status(403).send({ message: PERMISSION_DENIED });

/** /api/schools/:_id/* — params._id가 학교 */
export const requireSchoolManagerParam = (req, res, next) => {
  if (!isSchoolManager(req.user, req.params._id)) {
    return sendDenied(res);
  }
  next();
};

/** POST body.school */
export const requireSchoolManagerBodySchool = (req, res, next) => {
  if (!isSchoolManager(req.user, req.body.school)) {
    return sendDenied(res);
  }
  next();
};

/** /api/seasons/:_id/* — 학기의 학교 */
export const requireSeasonSchoolManager = async (req, res, next) => {
  try {
    const season = await Season(req.user.academyId)
      .findById(req.params._id)
      .select("school")
      .lean();
    if (!season) {
      return res.status(404).send({ message: __NOT_FOUND("season") });
    }
    if (!isSchoolManager(req.user, season.school)) {
      return sendDenied(res);
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/** body.season 학기의 학교 (AI 지침 템플릿 등) */
export const requireSeasonSchoolManagerFromBody = async (req, res, next) => {
  try {
    const seasonId = req.body.season;
    if (!seasonId) {
      return next();
    }
    const season = await Season(req.user.academyId)
      .findById(seasonId)
      .select("school")
      .lean();
    if (!season) {
      return res.status(404).send({ message: __NOT_FOUND("season") });
    }
    if (!isSchoolManager(req.user, season.school)) {
      return sendDenied(res);
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/** 양식에 school이 있으면 검사. 아카데미 전역 양식은 입구(isAdManager)만. */
export const requireFormSchoolManager = async (req, res, next) => {
  try {
    const form = await Form(req.user.academyId)
      .findById(req.params._id)
      .select("school")
      .lean();
    if (!form) {
      return res.status(404).send({ message: __NOT_FOUND("form") });
    }
    if (form.school && !isSchoolManager(req.user, form.school)) {
      return sendDenied(res);
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

export const requireRegistrationSchoolManager = async (req, res, next) => {
  try {
    const registration = await Registration(req.user.academyId)
      .findById(req.params._id)
      .select("school")
      .lean();
    if (!registration) {
      return res.status(404).send({ message: __NOT_FOUND("registration") });
    }
    if (!isSchoolManager(req.user, registration.school)) {
      return sendDenied(res);
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

export const requireRegistrationCreateSchoolManager = async (
  req,
  res,
  next
) => {
  try {
    const season = await Season(req.user.academyId)
      .findById(req.body.season)
      .select("school")
      .lean();
    if (!season) {
      return res.status(404).send({ message: __NOT_FOUND("season") });
    }
    if (!isSchoolManager(req.user, season.school)) {
      return sendDenied(res);
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

export const requireRegistrationCopySchoolManager = async (req, res, next) => {
  try {
    const [fromSeason, toSeason] = await Promise.all([
      Season(req.user.academyId)
        .findById(req.body.fromSeason)
        .select("school")
        .lean(),
      Season(req.user.academyId)
        .findById(req.body.toSeason)
        .select("school")
        .lean(),
    ]);
    if (!fromSeason) {
      return res.status(404).send({ message: __NOT_FOUND("fromSeason") });
    }
    if (!toSeason) {
      return res.status(404).send({ message: __NOT_FOUND("toSeason") });
    }
    if (
      !isSchoolManager(req.user, fromSeason.school) ||
      !isSchoolManager(req.user, toSeason.school)
    ) {
      return sendDenied(res);
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

export const requirePostBoardSchoolManager = async (req, res, next) => {
  try {
    const post = await Post(req.user.academyId)
      .findById(req.params._id)
      .select("board")
      .lean();
    if (!post) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }
    const board = await Board(req.user.academyId)
      .findById(post.board)
      .select("school schoolId")
      .lean();
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }
    if (!isSchoolManager(req.user, board.school || board.schoolId)) {
      return sendDenied(res);
    }
    next();
  } catch (err) {
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
