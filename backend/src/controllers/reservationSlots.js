/**
 * ReservationSlotAPI namespace
 * @namespace APIs.ReservationSlotAPI
 * @see TReservationSlot in {@link Models.ReservationSlot}
 */
import { logger } from "../log/logger.js";
import { Board, Post, ReservationSlot, Reservation } from "../models/index.js";
import {
  isBoardMember,
  getUserRoleInSeason,
  canManageBoard,
} from "../services/boards.js";
import {
  FIELD_REQUIRED,
  FIELD_INVALID,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";

/**
 * 게시글 작성자 또는 보드 관리자인지 확인
 */
const canManageSlots = (post, board, user) => {
  if (post.author.equals(user._id)) return true;
  return canManageBoard(board, user);
};

/**
 * @memberof APIs.ReservationSlotAPI
 * @function CReservationSlot
 * @description 예약 슬롯 개별 생성
 */
export const create = async (req, res) => {
  try {
    for (let field of ["post", "date"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const post = await Post(req.user.academyId).findById(req.body.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }
    if (post.postType !== "reservation") {
      return res.status(400).send({ message: FIELD_INVALID("postType") });
    }

    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageSlots(post, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const slotMode = post.reservationConfig?.slotMode || "time";

    // 모드별 필수 필드 검증
    if (slotMode === "time") {
      if (!req.body.startTime || !req.body.endTime) {
        return res.status(400).send({ message: FIELD_REQUIRED("startTime/endTime") });
      }
    } else {
      if (!req.body.label) {
        return res.status(400).send({ message: FIELD_REQUIRED("label") });
      }
    }

    const date = req.body.date;
    const dayOfWeek = new Date(date).getDay();

    const slot = await ReservationSlot(req.user.academyId).create({
      post: post._id,
      board: board._id,
      school: board.school,
      date,
      dayOfWeek,
      ...(slotMode === "time"
        ? { startTime: req.body.startTime, endTime: req.body.endTime }
        : { label: req.body.label }),
      ...(req.body.item ? { item: req.body.item } : {}),
      capacity: req.body.capacity ?? post.reservationConfig?.defaultCapacity ?? 1,
      memo: req.body.memo || "",
    });

    // totalSlots 업데이트
    post.reservationConfig.totalSlots = (post.reservationConfig.totalSlots || 0) + 1;
    post.markModified("reservationConfig");
    await post.save();

    return res.status(200).send({ reservationSlot: slot });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationSlotAPI
 * @function CReservationSlotsBulk
 * @description 예약 슬롯 일괄 생성
 */
export const createBulk = async (req, res) => {
  try {
    for (let field of ["post", "rule"]) {
      if (!(field in req.body)) {
        return res.status(400).send({ message: FIELD_REQUIRED(field) });
      }
    }

    const post = await Post(req.user.academyId).findById(req.body.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }
    if (post.postType !== "reservation") {
      return res.status(400).send({ message: FIELD_INVALID("postType") });
    }

    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageSlots(post, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const { rule } = req.body;
    const { startDate, endDate, days, excludeDates = [] } = rule;
    const slotMode = post.reservationConfig?.slotMode || "time";
    const capacity = rule.capacity ?? post.reservationConfig?.defaultCapacity ?? 1;

    if (!startDate || !endDate || !days || days.length === 0) {
      return res.status(400).send({ message: FIELD_REQUIRED("rule.startDate/endDate/days") });
    }

    if (slotMode === "time" && (!rule.timeSlots || rule.timeSlots.length === 0)) {
      return res.status(400).send({ message: FIELD_REQUIRED("rule.timeSlots") });
    }
    if (slotMode === "label" && (!rule.labels || rule.labels.length === 0)) {
      return res.status(400).send({ message: FIELD_REQUIRED("rule.labels") });
    }

    const excludeSet = new Set(excludeDates);

    // 날짜 범위에서 해당 요일 추출
    const dates = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const dow = current.getDay();
      if (days.includes(dow) && !excludeSet.has(dateStr)) {
        dates.push({ date: dateStr, dayOfWeek: dow });
      }
      current.setDate(current.getDate() + 1);
    }

    // 기존 슬롯 조회 (중복 방지)
    const existingSlots = await ReservationSlot(req.user.academyId).find({
      post: post._id,
      isActive: true,
    });

    const existingKeys = new Set(
      existingSlots.map((s) =>
        slotMode === "time"
          ? `${s.date}_${s.startTime}_${s.endTime}_${s.item || ""}`
          : `${s.date}_${s.label}_${s.item || ""}`
      )
    );

    // 슬롯 데이터 생성 (dates × timeSlots/labels × items 데카르트 곱)
    const slotsToCreate = [];
    const slotItems = slotMode === "time" ? rule.timeSlots : rule.labels;
    const resourceItems = rule.items && rule.items.length > 0 ? rule.items : [null];

    for (const { date, dayOfWeek } of dates) {
      for (const slotItem of slotItems) {
        for (const resourceItem of resourceItems) {
          const key =
            slotMode === "time"
              ? `${date}_${slotItem.startTime}_${slotItem.endTime}_${resourceItem || ""}`
              : `${date}_${slotItem}_${resourceItem || ""}`;

          if (existingKeys.has(key)) continue;

          slotsToCreate.push({
            post: post._id,
            board: board._id,
            school: board.school,
            date,
            dayOfWeek,
            ...(slotMode === "time"
              ? { startTime: slotItem.startTime, endTime: slotItem.endTime }
              : { label: slotItem }),
            ...(resourceItem ? { item: resourceItem } : {}),
            capacity,
          });
        }
      }
    }

    let created = [];
    if (slotsToCreate.length > 0) {
      created = await ReservationSlot(req.user.academyId).insertMany(slotsToCreate);

      // totalSlots 업데이트
      post.reservationConfig.totalSlots =
        (post.reservationConfig.totalSlots || 0) + created.length;
      post.markModified("reservationConfig");
      await post.save();
    }

    const totalPossible = dates.length * slotItems.length * resourceItems.length;
    return res.status(200).send({
      reservationSlots: created,
      created: created.length,
      skipped: totalPossible - created.length,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationSlotAPI
 * @function RReservationSlots/RReservationSlot
 * @description 예약 슬롯 목록/상세 조회
 */
export const find = async (req, res) => {
  try {
    /* RReservationSlot */
    if (req.params._id) {
      const slot = await ReservationSlot(req.user.academyId).findById(req.params._id);
      if (!slot || !slot.isActive) {
        return res.status(404).send({ message: __NOT_FOUND("reservationSlot") });
      }
      return res.status(200).send({ reservationSlot: slot });
    }

    /* RReservationSlots */
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

    // 보드 멤버 확인
    const role = await getUserRoleInSeason(
      req.user.academyId,
      board.schoolId,
      req.user
    );
    if (!isBoardMember(board, req.user, role)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const query = { post: post._id, isActive: true };

    // 선택적 필터
    if (req.query.status) query.status = req.query.status;
    if (req.query.date) query.date = req.query.date;
    if (req.query.dayOfWeek !== undefined) query.dayOfWeek = parseInt(req.query.dayOfWeek);
    if (req.query.item) query.item = req.query.item;

    const slots = await ReservationSlot(req.user.academyId)
      .find(query)
      .sort({ date: 1, startTime: 1, label: 1, item: 1 });

    return res.status(200).send({ reservationSlots: slots });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationSlotAPI
 * @function UReservationSlot
 * @description 예약 슬롯 수정
 */
export const update = async (req, res) => {
  try {
    const slot = await ReservationSlot(req.user.academyId).findById(req.params._id);
    if (!slot || !slot.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("reservationSlot") });
    }

    const post = await Post(req.user.academyId).findById(slot.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageSlots(post, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if ("capacity" in req.body) slot.capacity = req.body.capacity;
    if ("memo" in req.body) slot.memo = req.body.memo;
    if ("status" in req.body) slot.status = req.body.status;

    await slot.save();

    return res.status(200).send({ reservationSlot: slot });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationSlotAPI
 * @function DReservationSlot
 * @description 예약 슬롯 삭제 (soft delete)
 */
export const remove = async (req, res) => {
  try {
    const slot = await ReservationSlot(req.user.academyId).findById(req.params._id);
    if (!slot || !slot.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("reservationSlot") });
    }

    const post = await Post(req.user.academyId).findById(slot.post);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageSlots(post, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    // 승인된 예약이 있으면 삭제 차단
    const approvedCount = await Reservation(req.user.academyId).countDocuments({
      slot: slot._id,
      status: "approved",
      isActive: true,
    });
    if (approvedCount > 0) {
      return res.status(409).send({
        message: "승인된 예약이 있는 슬롯은 삭제할 수 없습니다.",
      });
    }

    // pending 예약 자동 취소
    await Reservation(req.user.academyId).updateMany(
      { slot: slot._id, status: "pending", isActive: true },
      { status: "cancelled" }
    );

    slot.isActive = false;
    await slot.save();

    // totalSlots 업데이트
    post.reservationConfig.totalSlots = Math.max(
      0,
      (post.reservationConfig.totalSlots || 0) - 1
    );
    post.markModified("reservationConfig");
    await post.save();

    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ReservationSlotAPI
 * @function DReservationSlotsBulk
 * @description 예약 슬롯 일괄 삭제
 */
export const removeBulk = async (req, res) => {
  try {
    if (!req.body.ids || req.body.ids.length === 0) {
      return res.status(400).send({ message: FIELD_REQUIRED("ids") });
    }

    const slots = await ReservationSlot(req.user.academyId).find({
      _id: { $in: req.body.ids },
      isActive: true,
    });

    if (slots.length === 0) {
      return res.status(404).send({ message: __NOT_FOUND("reservationSlots") });
    }

    // 모든 슬롯이 같은 게시글인지 확인
    const postId = slots[0].post;
    const post = await Post(req.user.academyId).findById(postId);
    if (!post || !post.isActive) {
      return res.status(404).send({ message: __NOT_FOUND("post") });
    }

    const board = await Board(req.user.academyId).findById(post.board);
    if (!board) {
      return res.status(404).send({ message: __NOT_FOUND("board") });
    }

    if (!canManageSlots(post, board, req.user)) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    const slotIds = slots.map((s) => s._id);

    // 승인된 예약이 있는 슬롯 확인
    const approvedCount = await Reservation(req.user.academyId).countDocuments({
      slot: { $in: slotIds },
      status: "approved",
      isActive: true,
    });
    if (approvedCount > 0) {
      return res.status(409).send({
        message: "승인된 예약이 있는 슬롯이 포함되어 있습니다.",
      });
    }

    // pending 예약 자동 취소
    await Reservation(req.user.academyId).updateMany(
      { slot: { $in: slotIds }, status: "pending", isActive: true },
      { status: "cancelled" }
    );

    // 슬롯 비활성화
    await ReservationSlot(req.user.academyId).updateMany(
      { _id: { $in: slotIds } },
      { isActive: false }
    );

    // totalSlots 업데이트
    post.reservationConfig.totalSlots = Math.max(
      0,
      (post.reservationConfig.totalSlots || 0) - slots.length
    );
    post.markModified("reservationConfig");
    await post.save();

    return res.status(200).send({ deleted: slots.length });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
