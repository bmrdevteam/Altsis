/**
 * ThemeSettings Service namespace
 * @namespace Services.ThemeSettingsService
 */

import { ThemeSetting } from "../models/index.js";
import { logger } from "../log/logger.js";

/**
 * 테마 설정 조회 (없으면 생성)
 * @memberof Services.ThemeSettingsService
 * @function getOrCreateThemeSetting
 *
 * @param {string} academyId - 아카데미 ID
 * @param {Object} user - 사용자 객체
 *
 * @returns {Promise<Object>} 테마 설정
 */
export const getOrCreateThemeSetting = async (academyId, user) => {
  let setting = await ThemeSetting(academyId).findOne({ user: user._id });

  if (!setting) {
    setting = await ThemeSetting(academyId).create({
      user: user._id,
      userId: user.userId,
      userName: user.userName,
      selectedTheme: "light",
      colors: {
        primaryColor: "#313775",
        backgroundColor: "#ffffff",
        componentColor: "#f5f5f5",
        textColor: "#000000",
        accentColor: "#007aff",
        successColor: "#52c41a",
        errorColor: "#ff4d4f",
      },
    });
  }

  return setting;
};
