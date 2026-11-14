import { z } from "zod";

export const avatarSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1).max(80),
  url: z.string().min(1),
  enabled: z.boolean(),
  builtin: z.boolean(),
});
export const avatarCatalogSchema = z.object({
  avatars: z.array(avatarSchema),
  defaultId: z.string(),
  mode: z.enum(["images", "colors"]).default("images"),
});
export type Avatar = z.infer<typeof avatarSchema>;
export type AvatarCatalog = z.infer<typeof avatarCatalogSchema>;
export const avatarActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mode"), mode: z.enum(["images", "colors"]) }),
  z.object({
    action: z.literal("enabled"),
    id: z.string(),
    enabled: z.boolean(),
  }),
  z.object({ action: z.literal("default"), id: z.string() }),
  z.object({ action: z.literal("builtins"), enabled: z.boolean() }),
]);
export type AvatarAction = z.infer<typeof avatarActionSchema>;
const files = [
  "profile1.png",
  "profile2.png",
  "profile3.png",
  "profile4.png",
  "profile5.jpg",
  "profile6.png",
  "profile7.jpg",
  "profile9.jpg",
  "profile10.jpg",
  "profile11.jpg",
  "profile12.png",
];
export const BUILTIN_AVATAR_CATALOG: AvatarCatalog = {
  avatars: files.map((file, index) => ({
    id: `builtin-${index + 1}`,
    label: `Avatar ${index + 1}`,
    url: `/images/player_profile/${file}`,
    enabled: true,
    builtin: true,
  })),
  defaultId: "builtin-1",
  mode: "images",
};
/** Keep at least one choice; switching off the default picks the next enabled avatar. */
export function applyAvatarAction(
  catalog: AvatarCatalog,
  action: AvatarAction,
): AvatarCatalog {
  if (action.action === "mode") return { ...catalog, mode: action.mode };
  if (
    action.action !== "builtins" &&
    !catalog.avatars.some((a) => a.id === action.id)
  )
    throw new Error("Avatar not found");
  const avatars = catalog.avatars.map((a) => ({
    ...a,
    enabled:
      action.action === "builtins" && a.builtin
        ? action.enabled
        : action.action === "enabled" && a.id === action.id
          ? action.enabled
          : a.enabled,
  }));
  const active = avatars.filter((a) => a.enabled);
  if (!active.length)
    throw new Error(
      "Keep at least one avatar enabled. Upload a custom avatar before hiding the defaults.",
    );
  let defaultId = action.action === "default" ? action.id : catalog.defaultId;
  if (!active.some((a) => a.id === defaultId)) {
    if (action.action === "default")
      throw new Error("Enable this avatar before making it the default");
    defaultId = active[0]!.id;
  }
  return { ...catalog, avatars, defaultId };
}

/** Bundled solid colors work offline and use the existing profile image pipeline. */
export const COLOR_AVATARS: Avatar[] = [
  "e11d48",
  "ea580c",
  "d97706",
  "65a30d",
  "059669",
  "0891b2",
  "2563eb",
  "4f46e5",
  "9333ea",
  "c026d3",
  "db2777",
  "475569",
].map((color) => ({
  id: `color-${color}`,
  label: `Cor #${color}`,
  url: `/images/player_colors/${color}.svg`,
  enabled: true,
  builtin: true,
}));
