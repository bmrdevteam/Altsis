export const SETTINGS_TABS = [
  "user",
  "social",
  "security",
  "notification",
  "school",
  "theme",
  "app",
] as const;

export type SettingsTab = (typeof SETTINGS_TABS)[number];

const TAB_SET = new Set<string>(SETTINGS_TABS);

export function parseSettingsTab(raw: string | null | undefined): SettingsTab {
  if (raw && TAB_SET.has(raw)) {
    return raw as SettingsTab;
  }
  return "user";
}
