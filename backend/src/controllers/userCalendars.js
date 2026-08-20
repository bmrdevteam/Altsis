/**
 * UserCalendarAPI namespace
 * @namespace APIs.UserCalendarAPI
 * @see TUserCalendar in {@link Models.UserCalendar}
 */

import { logger } from "../log/logger.js";
import { UserCalendar } from "../models/index.js";
import {
  FIELD_REQUIRED,
  PERMISSION_DENIED,
  __NOT_FOUND,
} from "../messages/index.js";
import {
  canManageSchoolCalendar,
  personalCalendarListFilter,
} from "../utils/calendarAuth.js";

/**
 * @memberof APIs.UserCalendarAPI
 * @function CUserCalendar API
 * @description 사용자 캘린더 생성 API
 */
export const create = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).send({ message: FIELD_REQUIRED("name") });
    }

    const scope = req.body.scope || "personal";

    if (scope === "school") {
      if (!canManageSchoolCalendar(req.user)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
      if (!req.body.school) {
        return res.status(400).send({ message: FIELD_REQUIRED("school") });
      }
    }

    const calendar = await UserCalendar(req.user.academyId).create({
      user: req.user._id,
      school: scope === "school" ? req.body.school : undefined,
      name: req.body.name,
      color: req.body.color || "#4285f4",
      scope,
      isDefault: false,
      isPrivate: scope === "personal" && req.body.isPrivate === true,
    });

    return res.status(200).send({ userCalendar: calendar });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.UserCalendarAPI
 * @function RUserCalendars API
 * @description 사용자 캘린더 목록 조회 API
 */
export const find = async (req, res) => {
  try {
    const targetUserId = req.query.user || req.user._id;
    const schoolQuery = { scope: "school" };
    if (req.query.school) {
      schoolQuery.school = req.query.school;
    }
    const query = {
      $or: [
        personalCalendarListFilter({
          viewerId: req.user._id,
          targetUserId,
        }),
        schoolQuery,
      ],
    };

    const calendars = await UserCalendar(req.user.academyId)
      .find(query)
      .sort({ isDefault: -1, createdAt: 1 })
      .lean();

    return res.status(200).send({ userCalendars: calendars });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.UserCalendarAPI
 * @function UUserCalendar API
 * @description 사용자 캘린더 수정 API
 */
export const update = async (req, res) => {
  try {
    const calendar = await UserCalendar(req.user.academyId).findById(
      req.params._id
    );
    if (!calendar) {
      return res.status(404).send({ message: __NOT_FOUND("userCalendar") });
    }

    if (calendar.scope === "school") {
      if (!canManageSchoolCalendar(req.user)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    } else if (
      String(calendar.user) !== String(req.user._id) &&
      !canManageSchoolCalendar(req.user)
    ) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    if (req.body.name !== undefined) calendar.name = req.body.name;
    if (req.body.color !== undefined) calendar.color = req.body.color;
    if (calendar.scope === "school") {
      calendar.isPrivate = false;
    } else if (req.body.isPrivate !== undefined) {
      calendar.isPrivate = req.body.isPrivate === true;
    }

    await calendar.save();
    return res.status(200).send({ userCalendar: calendar });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.UserCalendarAPI
 * @function DUserCalendar API
 * @description 사용자 캘린더 삭제 API
 */
export const remove = async (req, res) => {
  try {
    const calendar = await UserCalendar(req.user.academyId).findById(
      req.params._id
    );
    if (!calendar) {
      return res.status(404).send({ message: __NOT_FOUND("userCalendar") });
    }

    if (calendar.isDefault) {
      return res
        .status(400)
        .send({ message: "기본 캘린더는 삭제할 수 없습니다." });
    }

    if (calendar.scope === "school") {
      if (!canManageSchoolCalendar(req.user)) {
        return res.status(403).send({ message: PERMISSION_DENIED });
      }
    } else if (
      String(calendar.user) !== String(req.user._id) &&
      !canManageSchoolCalendar(req.user)
    ) {
      return res.status(403).send({ message: PERMISSION_DENIED });
    }

    await calendar.deleteOne();
    return res.status(200).send();
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
