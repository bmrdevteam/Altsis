/**
 * AIChatAPI namespace
 * @namespace APIs.AIChatAPI
 * @description AI 챗봇(Alter) 대화 API
 */

import { logger } from "../log/logger.js";
import {
  Board,
  AIChatSession,
  AIChatMessage,
  User,
} from "../models/index.js";
import {
  isBoardMember,
  getUserRoleInSeason,
} from "../services/boards.js";
import {
  boardAlterSessionFilter,
  getOrCreateSession,
  buildAIChatContents,
  callAI,
  getBoardTeacherUserIds,
  checkAIEnabled,
} from "../services/aiChat.js";
import {
  SKILL_IDS,
  resolveSkillId,
  detectSkillFromMessage,
  runAlterSkill,
} from "../services/aiSkills.js";
import { AI_ERRORS } from "../services/aiPromptPolicy.js";
import { getIoChat } from "../utils/webSocket.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * 보드 조회 + 멤버십 확인 헬퍼
 */
const getBoardAndVerifyMember = async (req) => {
  const board = await Board(req.user.academyId).findById(req.params._id);
  if (!board) return { error: { status: 404, message: __NOT_FOUND("board") } };

  const role = await getUserRoleInSeason(
    req.user.academyId,
    board.schoolId,
    req.user
  );
  if (!isBoardMember(board, req.user, role)) {
    return { error: { status: 403, message: PERMISSION_DENIED } };
  }

  return { board };
};

/**
 * altBoardRole에서 유저의 역할 확인
 */
const getAltBoardRole = (board, user) => {
  if (user.auth === "admin") return "admin";
  if (board.creator && board.creator.equals(user._id)) return "admin";
  if (!board.altBoardRole) return null;

  const roleMap =
    board.altBoardRole instanceof Map
      ? board.altBoardRole
      : new Map(Object.entries(board.altBoardRole));

  return roleMap.get(user._id.toString()) || null;
};

/**
 * @memberof APIs.AIChatAPI
 * @function RAIChatSettings
 * @description AI 채팅 활성화 여부 확인
 *
 * @method GET
 * @route /boards/:_id/ai-chat/settings
 */
export const getAIChatSettings = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const enabled = await checkAIEnabled(req.user.academyId);
    return res.status(200).send({ enabled });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AIChatAPI
 * @function RAIChatSessions
 * @description AI 채팅 세션 목록 조회
 * - 학생: 본인 세션만
 * - 교사(admin/writer): 전체 세션
 *
 * @method GET
 * @route /boards/:_id/ai-chat/sessions
 */
export const getAIChatSessions = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const altRole = getAltBoardRole(board, req.user);
    const isTeacher = altRole === "admin" || altRole === "writer";

    const query = boardAlterSessionFilter(
      board._id,
      isTeacher ? undefined : req.user._id
    );

    const sessions = await AIChatSession(req.user.academyId)
      .find(query)
      .sort({ lastMessageAt: -1 })
      .lean();

    return res.status(200).send({ sessions });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AIChatAPI
 * @function RAIChatMessages
 * @description AI 채팅 메시지 목록 조회
 *
 * @method GET
 * @route /boards/:_id/ai-chat/sessions/:sessionId/messages
 */
export const getAIChatMessages = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const { sessionId } = req.params;

    // 세션 조회 (양식 aiChat 세션은 보드 Alter API에서 제외)
    const session = await AIChatSession(req.user.academyId).findById(sessionId);
    if (
      !session ||
      session.board.toString() !== board._id.toString() ||
      session.form
    ) {
      return res.status(404).send({ message: __NOT_FOUND("session") });
    }

    // 학생은 본인 세션만 조회 가능
    const altRole = getAltBoardRole(board, req.user);
    const isTeacher = altRole === "admin" || altRole === "writer";
    if (!isTeacher && session.student.toString() !== req.user._id.toString()) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const limit = parseInt(req.query.limit) || 50;
    const messages = await AIChatMessage(req.user.academyId)
      .find({ session: sessionId, isDeleted: false })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return res.status(200).send({ messages });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.AIChatAPI
 * @function CAIChatMessage
 * @description AI 채팅 메시지 전송
 * - sessionId 없음: 본인 세션에서 AI와 대화 (학생/교사 공통)
 * - sessionId 있음 (교사만): 학생 세션에 교사 메시지 개입 (AI 응답 없음)
 *
 * @method POST
 * @route /boards/:_id/ai-chat/messages
 */
export const sendAIChatMessage = async (req, res) => {
  try {
    const { board, error } = await getBoardAndVerifyMember(req);
    if (error) return res.status(error.status).send({ message: error.message });

    const {
      content,
      sessionId: bodySessionId,
      skill: rawSkill,
      season: seasonId,
      context: skillContext,
      autoDetectSkill = true,
    } = req.body;
    if (!content) {
      return res.status(400).send({ message: FIELD_REQUIRED("content") });
    }

    let skill = rawSkill
      ? resolveSkillId(rawSkill)
      : autoDetectSkill
        ? detectSkillFromMessage(content)
        : SKILL_IDS.CHAT;

    const altRole = getAltBoardRole(board, req.user);
    const isTeacher = altRole === "admin" || altRole === "writer";

    const ioChat = getIoChat();

    // 교사가 학생 세션에 개입 (sessionId 지정 시, 보드 Alter만)
    if (isTeacher && bodySessionId) {
      const session = await AIChatSession(req.user.academyId).findById(
        bodySessionId
      );
      if (
        !session ||
        session.board.toString() !== board._id.toString() ||
        session.form
      ) {
        return res.status(404).send({ message: __NOT_FOUND("session") });
      }

      const teacherMsg = await AIChatMessage(req.user.academyId).create({
        session: session._id,
        board: board._id,
        senderType: "teacher",
        sender: req.user._id,
        senderId: req.user.userId,
        senderName: req.user.userName,
        senderProfile: req.user.profile,
        content,
      });

      // 세션 메타 업데이트
      await AIChatSession(req.user.academyId).findByIdAndUpdate(session._id, {
        lastMessageAt: new Date(),
        lastMessagePreview: content.substring(0, 100),
        $inc: { messageCount: 1 },
      });

      // 소켓: 학생 + 모든 교사에게
      if (ioChat) {
        const socketData = {
          boardId: board._id.toString(),
          sessionId: session._id.toString(),
          message: teacherMsg.toObject(),
        };

        // 세션 소유자(학생)에게 전송
        const student = await User(req.user.academyId).findById(
          session.student
        );
        if (student) {
          ioChat
            .to(`chat:${req.user.academyId}:${student.userId}`)
            .emit("ai_chat_message", socketData);
        }

        // 다른 교사들에게 전송
        const teacherObjIds = getBoardTeacherUserIds(board);
        for (const teacherObjId of teacherObjIds) {
          if (teacherObjId === req.user._id.toString()) continue;
          const teacher = await User(req.user.academyId).findById(teacherObjId);
          if (teacher) {
            ioChat
              .to(`chat:${req.user.academyId}:${teacher.userId}`)
              .emit("ai_chat_message", socketData);
          }
        }
      }

      return res.status(200).send({ messages: [teacherMsg] });
    }

    // 본인 세션에서 AI와 대화 (학생/교사 공통)
    const session = await getOrCreateSession(
      req.user.academyId,
      board,
      req.user
    );

    // 유저 메시지 저장
    const userMsg = await AIChatMessage(req.user.academyId).create({
      session: session._id,
      board: board._id,
      senderType: isTeacher ? "teacher" : "student",
      sender: req.user._id,
      senderId: req.user.userId,
      senderName: req.user.userName,
      senderProfile: req.user.profile,
      content,
      skill,
    });

    // 소켓: 다른 교사들에게 유저 메시지 전달
    if (ioChat) {
      const userSocketData = {
        boardId: board._id.toString(),
        sessionId: session._id.toString(),
        message: userMsg.toObject(),
      };

      const teacherObjIds = getBoardTeacherUserIds(board);
      for (const teacherObjId of teacherObjIds) {
        const teacher = await User(req.user.academyId).findById(teacherObjId);
        if (teacher) {
          ioChat
            .to(`chat:${req.user.academyId}:${teacher.userId}`)
            .emit("ai_chat_message", userSocketData);
        }
      }
    }

    // AI 응답 생성 (Skill 라우팅)
    let aiMsg = null;
    try {
      let aiText = "";
      let tokenUsage = null;
      let usedSkill = skill;

      const canUseSeasonSkill =
        !!seasonId &&
        (skill === SKILL_IDS.SYLLABUS_REVIEW ||
          skill === SKILL_IDS.CHAT);

      if (canUseSeasonSkill && skill === SKILL_IDS.SYLLABUS_REVIEW) {
        const result = await runAlterSkill({
          academyId: req.user.academyId,
          user: req.user,
          skill: SKILL_IDS.SYLLABUS_REVIEW,
          seasonId,
          context: skillContext || {},
          message: content,
          boardTitle: board.title || board.name,
        });
        aiText = result.text;
        tokenUsage = result.tokenUsage;
        usedSkill = result.skill;
      } else if (canUseSeasonSkill && skill === SKILL_IDS.CHAT && skillContext) {
        const recentMessages = await AIChatMessage(req.user.academyId)
          .find({ session: session._id, isDeleted: false })
          .sort({ createdAt: -1 })
          .limit(16)
          .lean();
        recentMessages.reverse();
        const history = recentMessages
          .filter((m) => m._id?.toString() !== userMsg._id.toString())
          .map((m) => ({
            role: m.senderType === "ai" ? "assistant" : "user",
            content: m.content,
          }));
        const result = await runAlterSkill({
          academyId: req.user.academyId,
          user: req.user,
          skill: SKILL_IDS.CHAT,
          seasonId,
          context: skillContext || {},
          message: content,
          history,
          boardTitle: board.title || board.name,
        });
        aiText = result.text;
        tokenUsage = result.tokenUsage;
        usedSkill = result.skill;
      } else {
        if (skill === SKILL_IDS.SYLLABUS_REVIEW && !seasonId) {
          aiText =
            "강의계획서 점검은 수업 작성 화면의 Alter에서 시작하거나, 학기·초안 문맥과 함께 요청해 주세요.";
          usedSkill = SKILL_IDS.CHAT;
        } else {
          const recentMessages = await AIChatMessage(req.user.academyId)
            .find({ session: session._id, isDeleted: false })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
          recentMessages.reverse();

          const { systemInstruction, messages: chatMessages } =
            buildAIChatContents(board, recentMessages);
          const aiResult = await callAI(
            req.user.academyId,
            systemInstruction,
            chatMessages,
            req.user
          );
          aiText = aiResult.text;
          tokenUsage = aiResult.tokenUsage;
          usedSkill = SKILL_IDS.CHAT;
        }
      }

      aiMsg = await AIChatMessage(req.user.academyId).create({
        session: session._id,
        board: board._id,
        senderType: "ai",
        sender: null,
        senderId: null,
        senderName: "Alter",
        content: aiText,
        skill: usedSkill,
        tokenUsage,
      });

      // 세션 메타 업데이트
      await AIChatSession(req.user.academyId).findByIdAndUpdate(session._id, {
        lastMessageAt: new Date(),
        lastMessagePreview: aiText.substring(0, 100),
        $inc: { messageCount: 2 }, // 학생 + AI
      });

      // 소켓: AI 응답을 학생 + 교사에게
      if (ioChat) {
        const aiSocketData = {
          boardId: board._id.toString(),
          sessionId: session._id.toString(),
          message: aiMsg.toObject(),
        };

        // 본인에게
        ioChat
          .to(`chat:${req.user.academyId}:${req.user.userId}`)
          .emit("ai_chat_message", aiSocketData);

        // 다른 교사들에게도 전달
        const teacherObjIds2 = getBoardTeacherUserIds(board);
        for (const teacherObjId of teacherObjIds2) {
          if (teacherObjId === req.user._id.toString()) continue;
          const teacher = await User(req.user.academyId).findById(teacherObjId);
          if (teacher) {
            ioChat
              .to(`chat:${req.user.academyId}:${teacher.userId}`)
              .emit("ai_chat_message", aiSocketData);
          }
        }
      }
    } catch (aiErr) {
      logger.error(`AI chat error: ${aiErr.message}`);
      const quotaExceeded =
        aiErr.code === AI_ERRORS.USAGE_LIMIT_EXCEEDED ||
        aiErr.message === AI_ERRORS.USAGE_LIMIT_EXCEEDED;
      // AI 실패 시에도 학생 메시지는 저장됨, 에러 메시지를 AI 응답으로 저장
      aiMsg = await AIChatMessage(req.user.academyId).create({
        session: session._id,
        board: board._id,
        senderType: "ai",
        sender: null,
        senderId: null,
        senderName: "Alter",
        content: quotaExceeded
          ? "오늘 AI 사용량(Alt) 한도를 초과했습니다. 관리자에게 문의해 주세요."
          : "죄송합니다. 일시적인 오류로 응답을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.",
      });

      // 세션 메타 업데이트
      await AIChatSession(req.user.academyId).findByIdAndUpdate(session._id, {
        lastMessageAt: new Date(),
        $inc: { messageCount: 2 },
      });

      // 에러 응답도 소켓으로 전달
      if (ioChat) {
        const errSocketData = {
          boardId: board._id.toString(),
          sessionId: session._id.toString(),
          message: aiMsg.toObject(),
        };
        ioChat
          .to(`chat:${req.user.academyId}:${req.user.userId}`)
          .emit("ai_chat_message", errSocketData);
      }
    }

    const messages = [userMsg];
    if (aiMsg) messages.push(aiMsg);

    return res.status(200).send({ messages });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
