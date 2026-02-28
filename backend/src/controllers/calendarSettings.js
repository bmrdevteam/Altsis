/**
 * CalendarSettings Controller namespace
 * @namespace APIs.CalendarSettingsAPI
 */

import { logger } from "../log/logger.js";
import { getOrCreateCalendarSetting } from "../services/calendarSettings.js";

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const VALID_CATEGORY_KEYS = [
  "schoolCalendar",
  "personalCalendar",
  "enrollments",
  "mentorings",
  "memos",
];

/**
 * @memberof APIs.CalendarSettingsAPI
 * @function RCalendarSettings API
 * @description 캘린더 설정 조회 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/calendar-settings/settings"} req.url
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Number[]} res.visibleDays - 표시할 요일
 * @param {string|null} res.referenceTime - 기준 시간
 * @param {Object} res.categoryColors - 카테고리별 색상
 */
export const getSettings = async (req, res) => {
  try {
    const setting = await getOrCreateCalendarSetting(
      req.user.academyId,
      req.user
    );

    return res.status(200).send({
      visibleDays: setting.visibleDays,
      referenceTime: setting.referenceTime,
      categoryColors: setting.categoryColors,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.CalendarSettingsAPI
 * @function UCalendarSettings API
 * @description 캘린더 설정 수정 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"PUT"} req.method
 * @param {"/calendar-settings/settings"} req.url
 *
 * @param {Object} req.body
 * @param {Number[]?} req.body.visibleDays - 표시할 요일
 * @param {string?} req.body.referenceTime - 기준 시간 (HH:MM 또는 null)
 * @param {Object?} req.body.categoryColors - 카테고리별 색상
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {Number[]} res.visibleDays
 * @param {string|null} res.referenceTime
 * @param {Object} res.categoryColors
 */
export const updateSettings = async (req, res) => {
  try {
    const setting = await getOrCreateCalendarSetting(
      req.user.academyId,
      req.user
    );

    // Update visibleDays
    if (req.body.visibleDays !== undefined) {
      if (!Array.isArray(req.body.visibleDays)) {
        return res
          .status(400)
          .send({ message: "visibleDays는 배열이어야 합니다." });
      }
      if (req.body.visibleDays.length === 0) {
        return res
          .status(400)
          .send({ message: "최소 1개의 요일을 선택해야 합니다." });
      }
      const validDays = req.body.visibleDays.every(
        (d) => Number.isInteger(d) && d >= 0 && d <= 6
      );
      if (!validDays) {
        return res
          .status(400)
          .send({ message: "유효하지 않은 요일 값입니다. (0-6)" });
      }
      setting.visibleDays = req.body.visibleDays;
    }

    // Update referenceTime
    if (req.body.referenceTime !== undefined) {
      if (req.body.referenceTime === null) {
        setting.referenceTime = null;
      } else if (TIME_REGEX.test(req.body.referenceTime)) {
        setting.referenceTime = req.body.referenceTime;
      } else {
        return res
          .status(400)
          .send({ message: "유효하지 않은 시간 형식입니다. (HH:MM)" });
      }
    }

    // Update categoryColors
    if (req.body.categoryColors) {
      for (const key of VALID_CATEGORY_KEYS) {
        if (key in req.body.categoryColors) {
          if (
            req.body.categoryColors[key] === null ||
            req.body.categoryColors[key] === ""
          ) {
            setting.categoryColors[key] = undefined;
          } else if (!HEX_COLOR_REGEX.test(req.body.categoryColors[key])) {
            return res
              .status(400)
              .send({ message: `유효하지 않은 색상 값입니다: ${key}` });
          } else {
            setting.categoryColors[key] = req.body.categoryColors[key];
          }
        }
      }
      setting.markModified("categoryColors");
    }

    await setting.save();

    return res.status(200).send({
      visibleDays: setting.visibleDays,
      referenceTime: setting.referenceTime,
      categoryColors: setting.categoryColors,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
