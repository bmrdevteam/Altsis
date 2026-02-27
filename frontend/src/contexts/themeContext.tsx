import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  CustomThemeColors,
  applyCustomTheme,
  clearCustomTheme,
} from "../utils/themeGenerator";

export type ThemeMode =
  | "light"
  | "dark"
  | "high-contrast"
  | "sepia"
  | "system"
  | "custom";

type PresetTheme = Exclude<ThemeMode, "system" | "custom">;

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: PresetTheme | "custom";
  darkModeActive: boolean;
  customColors: CustomThemeColors;
  setTheme: (mode: ThemeMode) => void;
  setCustomColors: (colors: CustomThemeColors) => void;
}

const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  primaryColor: "#313775",
  backgroundColor: "#ffffff",
  componentColor: "#f5f5f5",
  textColor: "#000000",
  accentColor: "#007aff",
  successColor: "#52c41a",
  errorColor: "#ff4d4f",
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyPresetTheme(theme: PresetTheme) {
  clearCustomTheme();
  document.documentElement.dataset.theme = theme;
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>("high-contrast");
  const [customColors, setCustomColorsState] =
    useState<CustomThemeColors>(DEFAULT_CUSTOM_COLORS);
  const [loading, setLoading] = useState(true);

  const resolvedTheme: PresetTheme | "custom" =
    theme === "system" ? getSystemTheme() : theme;

  const setTheme = useCallback((mode: ThemeMode) => {
    window.localStorage.setItem("appTheme", mode);
    setThemeState(mode);
  }, []);

  const setCustomColors = useCallback(
    (colors: CustomThemeColors) => {
      window.localStorage.setItem("customThemeColors", JSON.stringify(colors));
      setCustomColorsState(colors);
      if (theme === "custom") {
        applyCustomTheme(colors);
      }
    },
    [theme]
  );

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem("appTheme") as
      | ThemeMode
      | null;
    if (stored) {
      setThemeState(stored);
    }

    const storedColors = window.localStorage.getItem("customThemeColors");
    if (storedColors) {
      try {
        setCustomColorsState(JSON.parse(storedColors));
      } catch {
        // ignore invalid JSON
      }
    }

    setLoading(false);
  }, []);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    if (resolvedTheme === "custom") {
      applyCustomTheme(customColors);
    } else {
      applyPresetTheme(resolvedTheme);
    }
  }, [resolvedTheme, customColors]);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      applyPresetTheme(getSystemTheme());
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const darkModeActive = resolvedTheme === "dark";

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    darkModeActive,
    customColors,
    setTheme,
    setCustomColors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {!loading && children}
    </ThemeContext.Provider>
  );
};
