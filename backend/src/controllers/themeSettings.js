/**
 * ThemeSettings Controller namespace
 * @namespace APIs.ThemeSettingsAPI
 */

import { logger } from "../log/logger.js";
import { getOrCreateThemeSetting } from "../services/themeSettings.js";

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

const VALID_COLOR_KEYS = [
  "primaryColor",
  "backgroundColor",
  "componentColor",
  "textColor",
  "accentColor",
  "successColor",
  "errorColor",
];

const VALID_THEMES = [
  "light",
  "dark",
  "high-contrast",
  "sepia",
  "system",
  "custom",
];

/**
 * @memberof APIs.ThemeSettingsAPI
 * @function RThemeSettings API
 * @description 테마 설정 조회 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"GET"} req.method
 * @param {"/theme-settings/settings"} req.url
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {string} res.selectedTheme - 선택된 테마
 * @param {Object} res.colors - 사용자 정의 색상
 */
export const getSettings = async (req, res) => {
  try {
    const setting = await getOrCreateThemeSetting(
      req.user.academyId,
      req.user
    );

    return res.status(200).send({
      selectedTheme: setting.selectedTheme,
      colors: setting.colors,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};

/**
 * @memberof APIs.ThemeSettingsAPI
 * @function UThemeSettings API
 * @description 테마 설정 수정 API
 * @version 1.0.0
 *
 * @param {Object} req
 * @param {"PUT"} req.method
 * @param {"/theme-settings/settings"} req.url
 *
 * @param {Object} req.body
 * @param {string?} req.body.selectedTheme - 선택된 테마
 * @param {Object?} req.body.colors - 사용자 정의 색상
 *
 * @param {Object} req.user
 *
 * @param {Object} res
 * @param {string} res.selectedTheme - 수정된 선택 테마
 * @param {Object} res.colors - 수정된 사용자 정의 색상
 */
export const updateSettings = async (req, res) => {
  try {
    const setting = await getOrCreateThemeSetting(
      req.user.academyId,
      req.user
    );

    // Update selectedTheme
    if (req.body.selectedTheme) {
      if (!VALID_THEMES.includes(req.body.selectedTheme)) {
        return res.status(400).send({ message: "유효하지 않은 테마입니다." });
      }
      setting.selectedTheme = req.body.selectedTheme;
    }

    // Update colors
    if (req.body.colors) {
      for (const key of VALID_COLOR_KEYS) {
        if (key in req.body.colors) {
          if (!HEX_COLOR_REGEX.test(req.body.colors[key])) {
            return res
              .status(400)
              .send({ message: `유효하지 않은 색상 값입니다: ${key}` });
          }
          setting.colors[key] = req.body.colors[key];
        }
      }
      setting.markModified("colors");
    }

    await setting.save();

    return res.status(200).send({
      selectedTheme: setting.selectedTheme,
      colors: setting.colors,
    });
  } catch (err) {
    logger.error(err.message);
    return res.status(500).send({ message: "서버 오류가 발생했습니다." });
  }
};
