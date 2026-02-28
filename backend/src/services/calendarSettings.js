/**
 * CalendarSettings Service namespace
 * @namespace Services.CalendarSettingsService
 */

import { CalendarSetting } from "../models/index.js";

/**
 * 캘린더 설정 조회 (없으면 생성)
 * @memberof Services.CalendarSettingsService
 * @function getOrCreateCalendarSetting
 *
 * @param {string} academyId - 아카데미 ID
 * @param {Object} user - 사용자 객체
 *
 * @returns {Promise<Object>} 캘린더 설정
 */
export const getOrCreateCalendarSetting = async (academyId, user) => {
  let setting = await CalendarSetting(academyId).findOne({ user: user._id });

  if (!setting) {
    setting = await CalendarSetting(academyId).create({
      user: user._id,
      visibleDays: [0, 1, 2, 3, 4, 5, 6],
      referenceTime: null,
      categoryColors: {},
    });
  }

  return setting;
};
