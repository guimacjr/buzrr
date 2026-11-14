import { DEFAULT_BRANDING, type ThemeColor } from "@buzrr/contract";

/** Canvas APIs cannot resolve CSS custom properties themselves. */
export function resolveThemeColor(key: ThemeColor): string {
  if (typeof document === "undefined") return DEFAULT_BRANDING.light[key];
  const root = document.documentElement;
  return (
    getComputedStyle(root).getPropertyValue(`--color-theme-${key}`).trim() ||
    DEFAULT_BRANDING[root.classList.contains("dark") ? "dark" : "light"][key]
  );
}
