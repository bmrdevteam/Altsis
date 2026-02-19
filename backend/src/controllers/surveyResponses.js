/**
 * SurveyResponseAPI namespace
 * @namespace APIs.SurveyResponseAPI
 * @see TSurveyResponse in {@link Models.SurveyResponse}
 */
import { logger } from "../log/logger.js";
import { Board, Post, SurveyResponse } from "../models/index.js";
import {
  isBoardMember,
  getUserRoleInSeason,
} from "../services/boards.js";
import { signUrl, signUrlForView } from "../_s3/fileBucket.js";
import { surveyMulter } from "../_s3/surveyMulter.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  LIMIT_FILE_SIZE,
  INVALID_FILE_TYPE,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * post.surveys 배열에서 특정 설문 찾기
 */
function findSurveyInPost(post, surveyId) {
  return post.surveys?.find((s) => s._id.toString() === surveyId.toString());
}

/**
 * @memberof APIs.SurveyResponseAPI
 * @function CSurveyResponse API
 * @description 설문 응답 제출 API
 * @version 2.0.0
 */
export const create = async (req, res) => {
  try {
    for (let field of ["post", "surveyId", "answers"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const post = await Post(req.user.academyId).findById(req.body.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const survey = findSurveyInPost(post, req.body.surveyId);
    if (!survey || !survey.questions.length) {
      return res.status(400).send({ message: "해당 설문을 찾을 수 없습니다." });
    }

    // 보드 멤버 확인
    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!isBoardMember(board, req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 마감일 확인
    if (survey.settings.deadline) {
      if (new Date() > new Date(survey.settings.deadline)) {
        return res.status(400).send({ message: "설문이 마감되었습니다." });
      }
    }

    // 중복 응답 확인
    const existing = await SurveyResponse(req.user.academyId).findOne({
      post: post._id,
      surveyId: survey._id,
      respondent: req.user._id,
    });
    if (existing) {
      return res.status(409).send({ message: "이미 응답하셨습니다." });
    }

    // 답변 검증
    const validationError = validateAnswers(survey.questions, req.body.answers);
    if (validationError) {
      return res.status(400).send({ message: validationError });
    }

    const surveyResponse = await SurveyResponse(req.user.academyId).create({
      post: post._id,
      surveyId: survey._id,
      respondent: req.user._id,
      respondentId: req.user.userId,
      respondentName: req.user.userName,
      answers: req.body.answers,
    });

    // responseCount 증가
    survey.responseCount = (survey.responseCount || 0) + 1;
    post.markModified("surveys");
    await post.save();

    return res.status(200).send({ surveyResponse });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).send({ message: "이미 응답하셨습니다." });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SurveyResponseAPI
 * @function RSurveyResponseMy API
 * @description 내 설문 응답 조회 API
 * @version 2.0.0
 */
export const findMy = async (req, res) => {
  try {
    for (let field of ["post", "surveyId"]) {
      if (!(field in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const surveyResponse = await SurveyResponse(req.user.academyId).findOne({
      post: req.query.post,
      surveyId: req.query.surveyId,
      respondent: req.user._id,
    });

    // 파일 답변에 signed URL 추가
    if (surveyResponse) {
      const responseObj = surveyResponse.toObject();
      await signAnswerFiles(responseObj.answers);
      return res.status(200).send({ surveyResponse: responseObj });
    }

    return res.status(200).send({ surveyResponse: null });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SurveyResponseAPI
 * @function RSurveyResponses API
 * @description 설문 응답 전체 조회 API
 * @version 2.0.0
 */
export const findAll = async (req, res) => {
  try {
    for (let field of ["post", "surveyId"]) {
      if (!(field in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const post = await Post(req.user.academyId).findById(req.query.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const survey = findSurveyInPost(post, req.query.surveyId);
    if (!survey) {
      return res.status(404).send({ message: "해당 설문을 찾을 수 없습니다." });
    }

    // 결과 조회 권한 확인
    const canView = await canViewResults(req.user, post, survey);
    if (!canView) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    let surveyResponses = await SurveyResponse(req.user.academyId)
      .find({ post: post._id, surveyId: survey._id })
      .sort({ createdAt: -1 })
      .lean();

    // 파일 답변에 signed URL 추가
    for (const response of surveyResponses) {
      await signAnswerFiles(response.answers);
    }

    // 익명 모드 시 응답자 정보 제거 (작성자/관리자 제외)
    const isAuthor = post.author.equals(req.user._id);
    const isManager = req.user.auth === "admin" || req.user.auth === "manager";
    if (survey.settings.isAnonymous && !isAuthor && !isManager) {
      surveyResponses = surveyResponses.map((r) => ({
        ...r,
        respondent: undefined,
        respondentId: undefined,
        respondentName: undefined,
      }));
    }

    return res.status(200).send({ surveyResponses });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SurveyResponseAPI
 * @function RSurveyStats API
 * @description 설문 통계 조회 API
 * @version 2.0.0
 */
export const stats = async (req, res) => {
  try {
    for (let field of ["post", "surveyId"]) {
      if (!(field in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const post = await Post(req.user.academyId).findById(req.query.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const survey = findSurveyInPost(post, req.query.surveyId);
    if (!survey) {
      return res.status(404).send({ message: "해당 설문을 찾을 수 없습니다." });
    }

    // 결과 조회 권한 확인
    const canView = await canViewResults(req.user, post, survey);
    if (!canView) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const responses = await SurveyResponse(req.user.academyId)
      .find({ post: post._id, surveyId: survey._id })
      .lean();

    const totalResponses = responses.length;
    const questionStats = survey.questions.map((question) => {
      const answers = responses
        .map((r) => r.answers.find((a) => a.questionId === question.id))
        .filter(Boolean);

      const stat = {
        questionId: question.id,
        totalAnswers: answers.length,
      };

      switch (question.type) {
        case "singleChoice":
        case "dropdown": {
          stat.optionCounts = (question.options || []).map((opt) => ({
            optionId: opt.id,
            count: answers.filter((a) => a.value === opt.id).length,
          }));
          break;
        }
        case "multipleChoice": {
          stat.optionCounts = (question.options || []).map((opt) => ({
            optionId: opt.id,
            count: answers.filter(
              (a) => Array.isArray(a.value) && a.value.includes(opt.id)
            ).length,
          }));
          break;
        }
        case "rating": {
          const nums = answers.map((a) => Number(a.value)).filter((n) => !isNaN(n));
          stat.average = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
          stat.distribution = [1, 2, 3, 4, 5].map((v) => ({
            value: v,
            count: nums.filter((n) => n === v).length,
          }));
          break;
        }
        case "linearScale": {
          const nums = answers.map((a) => Number(a.value)).filter((n) => !isNaN(n));
          stat.average = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
          const min = question.scaleMin || 1;
          const max = question.scaleMax || 5;
          stat.distribution = [];
          for (let v = min; v <= max; v++) {
            stat.distribution.push({
              value: v,
              count: nums.filter((n) => n === v).length,
            });
          }
          break;
        }
        case "fileUpload": {
          stat.totalFiles = answers.reduce(
            (sum, a) => sum + (a.files?.length || 0),
            0
          );
          break;
        }
        // shortText, longText, date - totalAnswers만 제공
        default:
          break;
      }

      return stat;
    });

    return res.status(200).send({
      stats: { totalResponses, questionStats },
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SurveyResponseAPI
 * @function USurveyResponse API
 * @description 설문 응답 수정 API
 * @version 2.0.0
 */
export const update = async (req, res) => {
  try {
    const surveyResponse = await SurveyResponse(req.user.academyId).findById(
      req.params._id
    );
    if (!surveyResponse) {
      return res.status(404).send({ message: __NOT_FOUND("surveyResponse") });
    }

    // 본인만 수정 가능
    if (!surveyResponse.respondent.equals(req.user._id)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const post = await Post(req.user.academyId).findById(surveyResponse.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const survey = findSurveyInPost(post, surveyResponse.surveyId);
    if (!survey) {
      return res.status(404).send({ message: "해당 설문을 찾을 수 없습니다." });
    }

    // 수정 허용 확인
    if (!survey.settings.allowModify) {
      return res.status(403).send({ message: "응답 수정이 허용되지 않습니다." });
    }

    // 마감일 확인
    if (survey.settings.deadline) {
      if (new Date() > new Date(survey.settings.deadline)) {
        return res.status(400).send({ message: "설문이 마감되었습니다." });
      }
    }

    // 답변 검증
    if (!req.body.answers) {
      return res.status(400).send({ message: FIELD_REQUIRED("answers") });
    }

    const validationError = validateAnswers(survey.questions, req.body.answers);
    if (validationError) {
      return res.status(400).send({ message: validationError });
    }

    surveyResponse.answers = req.body.answers;
    await surveyResponse.save();

    return res.status(200).send({ surveyResponse });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SurveyResponseAPI
 * @function ExportSurveyJSON API
 * @description 설문 JSON 내보내기 API (구조만, 응답 미포함)
 * @version 1.0.0
 */
export const exportSurvey = async (req, res) => {
  try {
    const post = await Post(req.user.academyId).findById(req.params.postId);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const survey = findSurveyInPost(post, req.params.surveyId);
    if (!survey) {
      return res.status(404).send({ message: "해당 설문을 찾을 수 없습니다." });
    }

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      survey: {
        title: survey.title,
        description: survey.description,
        questions: survey.questions.map((q) => ({
          type: q.type,
          title: q.title,
          description: q.description || "",
          isRequired: q.isRequired || false,
          options: (q.options || []).map((o) => ({ text: o.text })),
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
          scaleMinLabel: q.scaleMinLabel,
          scaleMaxLabel: q.scaleMaxLabel,
          maxFiles: q.maxFiles,
          maxFileSize: q.maxFileSize,
        })),
        settings: {
          isAnonymous: survey.settings.isAnonymous,
          showResults: survey.settings.showResults,
          allowModify: survey.settings.allowModify,
        },
      },
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(survey.title || "survey")}.json"`
    );
    return res.status(200).send(exportData);
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.SurveyResponseAPI
 * @function CSurveyFileUpload API
 * @description 설문 파일 업로드 API
 * @version 1.0.0
 */
export const uploadFile = async (req, res) => {
  const postId = req.query.post || "temp";

  surveyMulter(postId).single("file")(req, {}, async (err) => {
    if (err) {
      switch (err.code) {
        case "LIMIT_FILE_SIZE":
          return res.status(409).send({ message: LIMIT_FILE_SIZE });
        case "INVALID_FILE_TYPE":
          return res.status(409).send({ message: INVALID_FILE_TYPE });
        default:
          return res.status(500).send({ message: err.code });
      }
    }

    try {
      return res.status(200).send({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        key: req.tmp.key,
      });
    } catch (err) {
      logger.error(err.message);
      return res.status(500).send({ message: "서버 오류가 발생했습니다." });
    }
  });
};

/**
 * @memberof APIs.SurveyResponseAPI
 * @function RSurveyFileSignedUrl API
 * @description 설문 파일 signed URL 발급 API
 * @version 1.0.0
 */
export const signFile = async (req, res) => {
  try {
    for (let field of ["key", "fileName"]) {
      if (!(field in req.query)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    // survey 경로인지 확인
    const keys = req.query.key.split("/");
    if (keys[1] !== "survey") {
      return res.status(400).send({ message: "잘못된 파일 경로입니다." });
    }

    const { preSignedUrl, expiryDate } = signUrl(
      req.query.key,
      req.query.fileName,
      300 // 5분
    );

    return res.status(200).send({ preSignedUrl, expiryDate });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

// ============================================================
// 유틸리티 함수
// ============================================================

/**
 * 답변 검증
 */
function validateAnswers(questions, answers) {
  if (!Array.isArray(answers)) {
    return "answers는 배열이어야 합니다.";
  }

  for (const question of questions) {
    if (!question.isRequired) continue;

    const answer = answers.find((a) => a.questionId === question.id);
    if (!answer) {
      return `필수 질문에 답변해주세요: ${question.title}`;
    }

    if (question.type === "fileUpload") {
      if (!answer.files || answer.files.length === 0) {
        return `필수 질문에 파일을 업로드해주세요: ${question.title}`;
      }
    } else {
      if (
        answer.value === undefined ||
        answer.value === null ||
        answer.value === "" ||
        (Array.isArray(answer.value) && answer.value.length === 0)
      ) {
        return `필수 질문에 답변해주세요: ${question.title}`;
      }
    }
  }

  return null;
}

/**
 * 결과 조회 권한 확인
 */
async function canViewResults(user, post, survey) {
  const isAuthor = post.author.equals(user._id);
  const isManager = user.auth === "admin" || user.auth === "manager";

  // 작성자/관리자는 항상 조회 가능
  if (isAuthor || isManager) return true;

  // afterResponse인 경우 응답한 사용자만 조회 가능
  if (survey.settings.showResults === "afterResponse") {
    const myResponse = await SurveyResponse(user.academyId).findOne({
      post: post._id,
      surveyId: survey._id,
      respondent: user._id,
    });
    return !!myResponse;
  }

  // creator인 경우 작성자/관리자만 (위에서 이미 처리)
  return false;
}

/**
 * 응답 파일에 signed URL 추가
 */
async function signAnswerFiles(answers) {
  for (const answer of answers) {
    if (answer.files && answer.files.length > 0) {
      for (const file of answer.files) {
        if (file.key) {
          const { preSignedUrl, expiryDate } = signUrl(
            file.key,
            file.fileName,
            300
          );
          file.preSignedUrl = preSignedUrl;
          file.expiryDate = expiryDate;
        }
      }
    }
  }
}
