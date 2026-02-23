/**
 * ReservationAPI namespace
 * @namespace APIs.ReservationAPI
 * @see TReservation in {@link Models.Reservation}
 */
import { logger } from "../log/logger.js";
import PQueue from "p-queue";
import { Board, Post, ReservationSlot, Reservation } from "../models/index.js";
import {
  isBoardMember,
  getUserRoleInSeason,
  canManageBoard,
} from "../services/boards.js";
import { sendAutoNotification } from "../services/notifications.js";
import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  FIELD_IN_USE,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

// 동시성 제어 (Enrollment 패턴과 동일)
const reservationQueue = new PQueue({ concurrency: 1 });

/**
 * 게시글 작성자 또는 보드 관리자인지 확인
 */
const canManageReservations = (post, board, user) => {
  if (post.author.equals(user._id)) return true;
  return canManageBoard(board, user);
};

/**
 * 예약 생성 실행 (큐 내에서 실행)
 */
const execCreateReservation = async (req, slotId) => {
  const _ReservationSlot = ReservationSlot(req.user.academyId);
  const _Reservation = Reservation(req.user.academyId);

  const slot = await _ReservationSlot.findById(slotId);
  if (!slot || !slot.isActive) {
    const err = new Error(__NOT_FOUND("reservationSlot"));
    err.status = 404;
    throw err;
  }

  if (slot.status !== "open") {
    const err = new Error("예약이 마감된 슬롯입니다.");
    err.status = 409;
    throw err;
  }

  const post = await Post(req.user.academyId).findById(slot.post);
  if (!post || !post.isActive) {
    const err = new Error(__NOT_FOUND("post"));
    err.status = 404;
    throw err;
  }

  const config = post.reservationConfig;
  const requireApproval = config?.requireApproval ?? true;

  // 예약 활성화 확인
  if (config?.isReservationActive === false) {
    const err = new Error("예약이 비활성화되었습니다.");
    err.status = 409;
    throw err;
  }

  // 정원 확인 (자동 승인 모드에서만 즉시 체크)
  if (!requireApproval && slot.currentCount >= slot.capacity) {
    const err = new Error("정원이 초과되었습니다.");
    err.status = 409;
    throw err;
  }

  // 중복 확인 (유니크 인덱스 보완)
  const existing = await _Reservation.findOne({
    slot: slot._id,
    user: req.user._id,
    isActive: true,
    status: { $in: ["pending", "approved"] },
  });
  if (existing) {
    const err = new Error(FIELD_IN_USE("reservation"));
    err.status = 409;
    throw err;
  }

  // 1인당 최대 예약 수 확인
  if (config?.maxReservationsPerUser > 0) {
    const userReservationCount = await _Reservation.countDocuments({
      post: slot.post,
      user: req.user._id,
      isActive: true,
      status: { $in: ["pending", "approved"] },
    });
    if (userReservationCount >= config.maxReservationsPerUser) {
      const err = new Error("1인당 최대 예약 수를 초과했습니다.");
      err.status = 409;
      throw err;
    }
  }

  // 예약 기간 확인
  const now = new Date();
  if (config?.reservationOpenAt && now < new Date(config.reservationOpenAt)) {
    const err = new Error("예약 오픈 전입니다.");
    err.status = 409;
    throw err;
  }
  if (config?.reservationCloseAt && now > new Date(config.reservationCloseAt)) {
    const err = new Error("예약이 마감되었습니다.");
    err.status = 409;
    throw err;
  }

  // 사전 예약 제한 확인 (슬롯 기준 상대 제한)
  if (config?.advanceBooking) {
    const { openBefore, closeBefore } = config.advanceBooking;

    // 슬롯 날짜/시간 기준점 계산
    const slotDateTime = slot.startTime
      ? new Date(`${slot.date}T${slot.startTime}:00`)
      : new Date(`${slot.date}T00:00:00`);

    if (openBefore && openBefore.value > 0) {
      const openTime = new Date(slotDateTime);
      if (openBefore.unit === "days") {
        openTime.setDate(openTime.getDate() - openBefore.value);
      } else {
        openTime.setHours(openTime.getHours() - openBefore.value);
      }
      if (now < openTime) {
        const err = new Error("아직 예약 오픈 전입니다.");
        err.status = 409;
        throw err;
      }
    }

    if (closeBefore && closeBefore.value > 0) {
      const closeTime = new Date(slotDateTime);
      if (closeBefore.unit === "days") {
        closeTime.setDate(closeTime.getDate() - closeBefore.value);
      } else {
        closeTime.setHours(closeTime.getHours() - closeBefore.value);
      }
      if (now > closeTime) {
        const err = new Error("예약 마감 시간이 지났습니다.");
        err.status = 409;
        throw err;
      }
    }
  }

  // 예약 생성
  const status = requireApproval ? "pending" : "approved";
  const reservationData = {
    slot: slot._id,
    post: slot.post,
    board: slot.board,
    school: slot.school,
    user: req.user._id,
    userId: req.user.userId,
    userName: req.user.userName,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    label: slot.label,
    item: slot.item,
    status,
    memo: req.body.memo || "",
  };

  // 지정 승인자
  if (req.body.approver) {
    reservationData.approver = req.body.approver;
    reservationData.approverId = req.body.approverId;
    reservationData.approverName = req.body.approverName;
  }

  // 신청 양식 응답
  if (req.body.applicationResponses?.length > 0) {
    reservationData.applicationResponses = req.body.applicationResponses;
  }

  const reservation = await _Reservation.create(reservationData);

  // 자동 승인 시 currentCount 증가
  if (!requireApproval) {
    slot.currentCount += 1;
    if (slot.currentCount >= slot.capacity) {
      slot.status = "full";
    }
    await slot.save();
  }

  return reservation;
};

/**
 * @memberof APIs.ReservationAPI
 * @function CReservation
 * @description 예약 개별 신청
 */
export const create = async (req, res) => {
  try {
    if (!("slot" in req.body)) {
      return res.status(400).send({ message: FIELD_REQUIRED("slot") });
    }

    // 보드 멤버 확인
    const slot = await ReservationSlot(req.user.academyId).findById(req.body.slot);
    if (!slot || !slot.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("reservationSlot") });
    }

    const board = await Board(req.user.academyId).findById(slot.board);
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

    const reservation = await reservationQueue.add(() =>
      execCreateReservation(req, req.body.slot)
    );

    return res.status(200).send({ reservation });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).send({ message: err.message });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationAPI
 * @function CReservationsBulk
 * @description 예약 일괄 신청
 */
export const createBulk = async (req, res) => {
  try {
    if (!req.body.slots || req.body.slots.length === 0) {
      return res.status(400).send({ message: FIELD_REQUIRED("slots") });
    }

    // 첫 슬롯으로 보드 멤버 확인
    const firstSlot = await ReservationSlot(req.user.academyId).findById(
      req.body.slots[0]
    );
    if (!firstSlot || !firstSlot.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("reservationSlot") });
    }

    const board = await Board(req.user.academyId).findById(firstSlot.board);
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

    // 순차 처리 (큐 내에서)
    const results = [];
    const errors = [];

    for (const slotId of req.body.slots) {
      try {
        const reservation = await reservationQueue.add(() =>
          execCreateReservation(req, slotId)
        );
        results.push(reservation);
      } catch (err) {
        errors.push({ slot: slotId, message: err.message });
      }
    }

    return res.status(200).send({ reservations: results, errors });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).send({ message: err.message });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationAPI
 * @function RReservations
 * @description 예약 목록 조회
 */
export const find = async (req, res) => {
  try {
    /* RReservation (단건) */
    if (req.params._id) {
      const reservation = await Reservation(req.user.academyId).findById(
        req.params._id
      );
      if (!reservation || !reservation.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("reservation") });
      }
      return res.status(200).send({ reservation });
    }

    /* RReservations (목록) */
    if (!("post" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("post") });
    }

    const post = await Post(req.user.academyId).findById(req.query.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

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

    const query = { post: post._id, isActive: true };

    // 관리자/작성자가 아니면 본인 예약만 조회
    if (!canManageReservations(post, board, req.user)) {
      query.user = req.user._id;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.slot) query.slot = req.query.slot;

    const reservations = await Reservation(req.user.academyId)
      .find(query)
      .sort({ date: 1, startTime: 1, label: 1, item: 1, createdAt: -1 });

    return res.status(200).send({ reservations });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationAPI
 * @function RMyReservations
 * @description 내 예약 목록 조회
 */
export const findMy = async (req, res) => {
  try {
    if (!("school" in req.query)) {
      return res.status(400).send({ message: FIELD_REQUIRED("school") });
    }

    const query = {
      user: req.user._id,
      school: req.query.school,
      isActive: true,
    };

    if (req.query.post) query.post = req.query.post;
    if (req.query.status) query.status = req.query.status;

    const reservations = await Reservation(req.user.academyId)
      .find(query)
      .sort({ date: 1, startTime: 1, label: 1, item: 1 });

    return res.status(200).send({ reservations });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationAPI
 * @function UReservationApprove
 * @description 예약 승인
 */
export const approve = async (req, res) => {
  try {
    const result = await reservationQueue.add(() =>
      execApprove(req, req.params._id)
    );
    return res.status(200).send({ reservation: result });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).send({ message: err.message });
    }
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

const execApprove = async (req, reservationId) => {
  const reservation = await Reservation(req.user.academyId).findById(reservationId);
  if (!reservation || !reservation.isActive) {
    const err = new Error(__NOT_FOUND("reservation"));
    err.status = 404;
    throw err;
  }

  if (reservation.status !== "pending") {
    const err = new Error(FIELD_INVALID("status"));
    err.status = 400;
    throw err;
  }

  const post = await Post(req.user.academyId).findById(reservation.post);
  if (!post) {
    const err = new Error(__NOT_FOUND("post"));
    err.status = 404;
    throw err;
  }

  const board = await Board(req.user.academyId).findById(reservation.board);
  if (!board) {
    const err = new Error(__NOT_FOUND("board"));
    err.status = 404;
    throw err;
  }

  if (!canManageReservations(post, board, req.user)) {
    const err = new Error(PERMISSION_DENIED);
    err.status = 403;
    throw err;
  }

  // 정원 확인
  const slot = await ReservationSlot(req.user.academyId).findById(reservation.slot);
  if (!slot || !slot.isActive) {
    const err = new Error(__NOT_FOUND("reservationSlot"));
    err.status = 404;
    throw err;
  }

  if (slot.currentCount >= slot.capacity) {
    const err = new Error("정원이 초과되었습니다.");
    err.status = 409;
    throw err;
  }

  // 승인 처리
  reservation.status = "approved";
  reservation.processedBy = req.user._id;
  reservation.processedByName = req.user.userName;
  reservation.processedAt = new Date();
  await reservation.save();

  // 슬롯 카운트 업데이트
  slot.currentCount += 1;
  if (slot.currentCount >= slot.capacity) {
    slot.status = "full";
  }
  await slot.save();

  // 신청자에게 알림
  try {
    await sendAutoNotification({
      academyId: req.user.academyId,
      toUserList: [{ userId: reservation.userId, userName: reservation.userName }],
      notificationType: "reservationApproved",
      category: "예약",
      title: `[예약 승인] ${post.title}`,
      description: `${reservation.date} 예약이 승인되었습니다.`,
      relatedEntity: { type: "post", id: post._id },
      fromUser: req.user,
    });
  } catch (notifyErr) {
    logger.error(`Failed to send reservation notification: ${notifyErr.message}`);
  }

  return reservation;
};

/**
 * @memberof APIs.ReservationAPI
 * @function UReservationReject
 * @description 예약 거절
 */
export const reject = async (req, res) => {
  try {
    const reservation = await Reservation(req.user.academyId).findById(
      req.params._id
    );
    if (!reservation || !reservation.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("reservation") });
    }

    if (reservation.status !== "pending") {
      return res.status(400).send({ message: FIELD_INVALID("status") });
    }

    const post = await Post(req.user.academyId).findById(reservation.post);
    if (!post) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const board = await Board(req.user.academyId).findById(reservation.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageReservations(post, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    reservation.status = "rejected";
    reservation.processedBy = req.user._id;
    reservation.processedByName = req.user.userName;
    reservation.processedAt = new Date();
    reservation.rejectReason = req.body.reason || "";
    await reservation.save();

    // 신청자에게 알림
    try {
      await sendAutoNotification({
        academyId: req.user.academyId,
        toUserList: [{ userId: reservation.userId, userName: reservation.userName }],
        notificationType: "reservationRejected",
        category: "예약",
        title: `[예약 거절] ${post.title}`,
        description: reservation.rejectReason
          ? `${reservation.date} 예약이 거절되었습니다. 사유: ${reservation.rejectReason}`
          : `${reservation.date} 예약이 거절되었습니다.`,
        relatedEntity: { type: "post", id: post._id },
        fromUser: req.user,
      });
    } catch (notifyErr) {
      logger.error(`Failed to send reservation notification: ${notifyErr.message}`);
    }

    return res.status(200).send({ reservation });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationAPI
 * @function UReservationsBulkApprove
 * @description 예약 일괄 승인
 */
export const bulkApprove = async (req, res) => {
  try {
    if (!req.body.ids || req.body.ids.length === 0) {
      return res.status(400).send({ message: FIELD_REQUIRED("ids") });
    }

    const results = [];
    const errors = [];

    for (const id of req.body.ids) {
      try {
        const reservation = await reservationQueue.add(() =>
          execApprove(req, id)
        );
        results.push(reservation);
      } catch (err) {
        errors.push({ id, message: err.message });
      }
    }

    return res.status(200).send({ reservations: results, errors });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationAPI
 * @function UReservationsBulkReject
 * @description 예약 일괄 거절
 */
export const bulkReject = async (req, res) => {
  try {
    if (!req.body.ids || req.body.ids.length === 0) {
      return res.status(400).send({ message: FIELD_REQUIRED("ids") });
    }

    const reservations = await Reservation(req.user.academyId).find({
      _id: { $in: req.body.ids },
      status: "pending",
      isActive: true,
    });

    if (reservations.length === 0) {
      return res.status(404).send({ message: __NOT_FOUND("reservations") });
    }

    // 권한 확인 (첫 건 기준)
    const post = await Post(req.user.academyId).findById(reservations[0].post);
    if (!post) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const board = await Board(req.user.academyId).findById(reservations[0].board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageReservations(post, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const reason = req.body.reason || "";
    const now = new Date();

    await Reservation(req.user.academyId).updateMany(
      { _id: { $in: reservations.map((r) => r._id) } },
      {
        status: "rejected",
        processedBy: req.user._id,
        processedByName: req.user.userName,
        processedAt: now,
        rejectReason: reason,
      }
    );

    // 알림 발송
    try {
      const toUserList = reservations.map((r) => ({
        userId: r.userId,
        userName: r.userName,
      }));
      await sendAutoNotification({
        academyId: req.user.academyId,
        toUserList,
        notificationType: "reservationRejected",
        category: "예약",
        title: `[예약 거절] ${post.title}`,
        description: reason
          ? `예약이 거절되었습니다. 사유: ${reason}`
          : `예약이 거절되었습니다.`,
        relatedEntity: { type: "post", id: post._id },
        fromUser: req.user,
      });
    } catch (notifyErr) {
      logger.error(`Failed to send reservation notification: ${notifyErr.message}`);
    }

    return res.status(200).send({ rejected: reservations.length });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationAPI
 * @function DReservation
 * @description 예약 취소
 */
export const cancel = async (req, res) => {
  try {
    const reservation = await Reservation(req.user.academyId).findById(
      req.params._id
    );
    if (!reservation || !reservation.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("reservation") });
    }

    // 본인 확인 (관리자도 취소 가능)
    const isOwner = reservation.user.equals(req.user._id);
    const isManager = req.user.auth === "admin" || req.user.auth === "manager";

    if (!isOwner && !isManager) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (reservation.status !== "pending" && reservation.status !== "approved") {
      return res.status(400).send({ message: FIELD_INVALID("status") });
    }

    const wasApproved = reservation.status === "approved";

    reservation.status = "cancelled";
    await reservation.save();

    // 승인 상태에서 취소하면 정원 복원
    if (wasApproved) {
      const slot = await ReservationSlot(req.user.academyId).findById(
        reservation.slot
      );
      if (slot) {
        slot.currentCount = Math.max(0, slot.currentCount - 1);
        if (slot.status === "full") {
          slot.status = "open";
        }
        await slot.save();
      }
    }

    return res.status(200).send({ reservation });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
