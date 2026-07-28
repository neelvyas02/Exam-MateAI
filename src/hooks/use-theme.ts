import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "exammate-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }, []);

  const setTheme = useCallback((next: "light" | "dark") => {
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggleTheme };
}
