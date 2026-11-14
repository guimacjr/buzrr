import { z } from "zod";

export const THEME_COLORS = {
  primary: "Primary color / links",
  accent: "Button gradient start",
  accentDeep: "Button gradient end",
  onPrimary: "Text on primary buttons",
  onAccent: "Text on gradient buttons",
  background: "Page background",
  surface: "Panels and dialogs",
  card: "Cards and fields",
  cardHover: "Card hover",
  text: "Main text",
  muted: "Secondary text",
  border: "Borders",
  success: "Success / correct",
  danger: "Error / incorrect",
  warning: "Warning",
  secondary: "Secondary highlight",
  onSecondary: "Text on secondary highlight",
  barMuted: "Inactive answer bars",
  answer1: "Answer A",
  answer2: "Answer B",
  answer3: "Answer C",
  answer4: "Answer D",
  answer5: "Answer E",
  answer6: "Answer F",
  gold: "First place",
  silver: "Second place",
  bronze: "Third place",
  onMedal: "Podium badge text",
  flame: "Streak highlight",
} as const;
export type ThemeColor = keyof typeof THEME_COLORS;
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit HEX color, e.g. #7d49f8");
export const themePaletteSchema = z.record(
  z.enum(Object.keys(THEME_COLORS) as [ThemeColor, ...ThemeColor[]]),
  hexColor,
);
export type ThemePalette = z.infer<typeof themePaletteSchema>;
export const themeSettingsSchema = z
  .object({ light: themePaletteSchema, dark: themePaletteSchema })
  .strict();
export type ThemeSettings = z.infer<typeof themeSettingsSchema>;
export const brandingSchema = themeSettingsSchema.extend({
  logoUrl: z.string().nullable(),
});
export type Branding = z.infer<typeof brandingSchema>;
const shared = {
  onPrimary: "#ffffff",
  onAccent: "#ffffff",
  success: "#2f9e6a",
  warning: "#e0a020",
  barMuted: "#8a8896",
  answer1: "#7c4ddb",
  answer2: "#e5544e",
  answer3: "#2f9e6a",
  answer4: "#e0a020",
  answer5: "#3b82f6",
  answer6: "#db2777",
  gold: "#f4c542",
  silver: "#cfd3dc",
  bronze: "#e0a173",
  onMedal: "#3a2a00",
  flame: "#f0612a",
};
export const DEFAULT_BRANDING: Branding = {
  light: {
    ...shared,
    primary: "#7d49f8",
    accent: "#9a6cf5",
    accentDeep: "#7c4ddb",
    background: "#f5f3ff",
    surface: "#ffffff",
    card: "#ede9fe",
    cardHover: "#ddd5ff",
    text: "#161b28",
    muted: "#334155",
    border: "#cbd5e1",
    danger: "#c92929",
    secondary: "#c4ee4f",
    onSecondary: "#2c3a08",
  },
  dark: {
    ...shared,
    onPrimary: "#161b28",
    primary: "#a78bfa",
    accent: "#7c3aed",
    accentDeep: "#6d28d9",
    background: "#0b0d12",
    surface: "#161b28",
    card: "#1e2433",
    cardHover: "#252c3d",
    text: "#ffffff",
    muted: "#94a3b8",
    border: "#475569",
    danger: "#e84b4b",
    secondary: "#b8e94a",
    onSecondary: "#15200a",
    barMuted: "#71717a",
  },
  logoUrl: null,
};
/** Validate again before generating CSS; values cannot contain style/script markup. */
export function brandingCss(settings: ThemeSettings): string {
  const validated = themeSettingsSchema.parse({
    light: settings.light,
    dark: settings.dark,
  });
  const declarations = (palette: ThemePalette) =>
    Object.entries(palette)
      .map(([key, value]) => `--color-theme-${key}:${value};`)
      .join("");
  return `:root{${declarations(validated.light)}}:root.dark{${declarations(validated.dark)}}`;
}
