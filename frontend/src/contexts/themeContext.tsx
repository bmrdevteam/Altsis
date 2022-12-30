import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext<any>(null);

export function useTheme() {
  return useContext(ThemeContext);
}

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkModeActive, setDarkModeActive] = useState<boolean>();
  const [loading, setLoading] = useState<boolean>(true);

  function setDefaultAppTheme(mode: "dark" | "light") {
    window.localStorage.setItem("appTheme", mode);
    setDarkModeActive(mode === "dark");
  }

  useEffect(() => {
    if (darkModeActive || window.localStorage.getItem("appTheme") === "dark") {
      document.documentElement.dataset.theme = "dark";
      setDarkModeActive(true);
    } else {
      document.documentElement.dataset.theme = "light";
    }

    if (window.localStorage.getItem("appTheme") === "light") {
      document.documentElement.dataset.theme = "light";
    }
    setLoading(false);
  }, [darkModeActive]);

  const value = {
    setDefaultAppTheme,
    darkModeActive,
  };
  return (
    <ThemeContext.Provider value={value}>
      {!loading && children}
    </ThemeContext.Provider>
  );
};
