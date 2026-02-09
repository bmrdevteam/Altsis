import { useEffect, useState } from "react";
import { useTheme, ThemeMode } from "../../../contexts/themeContext";
import {
  CustomThemeColors,
  generateColorsFromPrimary,
} from "../../../utils/themeGenerator";
import ColorPicker from "../../../components/colorPicker/ColorPicker";
import useAPIv2, { ALERT_ERROR } from "../../../hooks/useAPIv2";
import style from "../../../style/pages/settings/settings.module.scss";
import themeStyle from "./themeSettings.module.scss";

const presetOptions: {
  mode: Exclude<ThemeMode, "custom">;
  label: string;
  description: string;
}[] = [
  {
    mode: "light",
    label: "라이트",
    description: "밝은 배경에 어두운 텍스트",
  },
  {
    mode: "dark",
    label: "다크",
    description: "어두운 배경에 밝은 텍스트",
  },
  {
    mode: "system",
    label: "시스템",
    description: "기기의 테마를 따라갑니다",
  },
  {
    mode: "high-contrast",
    label: "고대비",
    description: "강한 명암비로 가독성 향상",
  },
  {
    mode: "sepia",
    label: "세피아",
    description: "따뜻한 톤으로 눈의 피로 감소",
  },
];

const colorFields: {
  key: keyof CustomThemeColors;
  label: string;
}[] = [
  { key: "primaryColor", label: "주 색상" },
  { key: "backgroundColor", label: "배경색" },
  { key: "componentColor", label: "컴포넌트 배경" },
  { key: "textColor", label: "텍스트 색상" },
  { key: "accentColor", label: "강조색" },
  { key: "successColor", label: "성공 색상" },
  { key: "errorColor", label: "오류 색상" },
];

const ThemeSettings = () => {
  const { theme, setTheme, customColors, setCustomColors } = useTheme();
  const { ThemeSettingsAPI } = useAPIv2();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoGenerate, setAutoGenerate] = useState(true);

  // Load theme settings from backend on mount
  useEffect(() => {
    ThemeSettingsAPI.RThemeSettings()
      .then(({ selectedTheme, colors }) => {
        if (selectedTheme) {
          setTheme(selectedTheme as ThemeMode);
        }
        if (colors) {
          setCustomColors(colors);
        }
        setLoaded(true);
      })
      .catch(() => {
        // Backend unavailable - use localStorage values
        setLoaded(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePresetSelect = async (mode: Exclude<ThemeMode, "custom">) => {
    setTheme(mode);
    try {
      await ThemeSettingsAPI.UThemeSettings({
        data: { selectedTheme: mode },
      });
    } catch {
      // Silent fail - localStorage already updated
    }
  };

  const handleCustomSelect = () => {
    setTheme("custom");
    ThemeSettingsAPI.UThemeSettings({
      data: { selectedTheme: "custom" },
    }).catch(() => {});
  };

  const handleColorChange = (key: keyof CustomThemeColors, value: string) => {
    if (autoGenerate && key === "primaryColor") {
      setCustomColors(generateColorsFromPrimary(value));
    } else {
      setCustomColors({ ...customColors, [key]: value });
    }
  };

  const handleSaveCustom = async () => {
    setSaving(true);
    try {
      await ThemeSettingsAPI.UThemeSettings({
        data: { selectedTheme: "custom", colors: customColors },
      });
    } catch (err: any) {
      ALERT_ERROR(err);
    }
    setSaving(false);
  };

  if (!loaded) return null;

  return (
    <div className={style.settings_container}>
      <div className={style.container_title}>테마</div>

      {/* Preset themes */}
      <div className={themeStyle.themeGrid}>
        {presetOptions.map((opt) => (
          <button
            key={opt.mode}
            className={`${themeStyle.themeCard} ${
              theme === opt.mode ? themeStyle.active : ""
            }`}
            onClick={() => handlePresetSelect(opt.mode)}
            type="button"
          >
            <div
              className={`${themeStyle.preview} ${
                themeStyle[`preview_${opt.mode.replace("-", "_")}`] ?? ""
              }`}
            >
              <div className={themeStyle.previewBar} />
              <div className={themeStyle.previewContent}>
                <div className={themeStyle.previewLine} />
                <div className={themeStyle.previewLineShort} />
              </div>
            </div>
            <div className={themeStyle.cardInfo}>
              <span className={themeStyle.cardLabel}>{opt.label}</span>
              <span className={themeStyle.cardDesc}>{opt.description}</span>
            </div>
          </button>
        ))}

        {/* Custom theme card */}
        <button
          className={`${themeStyle.themeCard} ${
            theme === "custom" ? themeStyle.active : ""
          }`}
          onClick={handleCustomSelect}
          type="button"
        >
          <div className={`${themeStyle.preview} ${themeStyle.preview_custom}`}>
            <div className={themeStyle.previewBar} />
            <div className={themeStyle.previewContent}>
              <div className={themeStyle.previewLine} />
              <div className={themeStyle.previewLineShort} />
            </div>
          </div>
          <div className={themeStyle.cardInfo}>
            <span className={themeStyle.cardLabel}>사용자 정의</span>
            <span className={themeStyle.cardDesc}>
              직접 색상을 선택합니다
            </span>
          </div>
        </button>
      </div>

      {/* Custom theme editor */}
      {theme === "custom" && (
        <div className={themeStyle.customEditor}>
          <div className={themeStyle.editorHeader}>
            <div className={themeStyle.editorTitle}>색상 설정</div>
            <label className={themeStyle.autoToggle}>
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
              />
              <span>주 색상으로 자동 생성</span>
            </label>
          </div>

          {autoGenerate ? (
            <div className={themeStyle.primaryOnly}>
              <div className={themeStyle.primaryPicker}>
                <ColorPicker
                  label="주 색상을 선택하면 나머지가 자동으로 생성됩니다"
                  value={customColors.primaryColor}
                  onChange={(color) =>
                    handleColorChange("primaryColor", color)
                  }
                />
              </div>
              <div className={themeStyle.generatedPreview}>
                {colorFields.slice(1).map((field) => (
                  <div key={field.key} className={themeStyle.generatedItem}>
                    <div
                      className={themeStyle.generatedSwatch}
                      style={{ backgroundColor: customColors[field.key] }}
                    />
                    <span className={themeStyle.generatedLabel}>
                      {field.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={themeStyle.colorGrid}>
              {colorFields.map((field) => (
                <div key={field.key} className={themeStyle.colorField}>
                  <ColorPicker
                    label={field.label}
                    value={customColors[field.key]}
                    onChange={(color) => handleColorChange(field.key, color)}
                  />
                </div>
              ))}
            </div>
          )}

          <div className={themeStyle.editorActions}>
            <button
              className={themeStyle.saveBtn}
              onClick={handleSaveCustom}
              disabled={saving}
              type="button"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeSettings;
