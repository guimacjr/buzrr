"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_BRANDING,
  THEME_COLORS,
  themeSettingsSchema,
  type ThemeColor,
  type ThemeSettings,
  type Branding,
} from "@buzrr/contract";
import { toast } from "react-toastify";
import { useCurrentRole } from "@/components/SessionProvider";
import {
  BRANDING_QUERY_KEY,
  useBranding,
} from "@/components/Branding/BrandingProvider";
import { getAuthApiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";

const GROUPS: { title: string; keys: ThemeColor[] }[] = [
  {
    title: "Brand and buttons",
    keys: [
      "primary",
      "accent",
      "accentDeep",
      "onPrimary",
      "onAccent",
      "secondary",
      "onSecondary",
    ],
  },
  {
    title: "Backgrounds and text",
    keys: [
      "background",
      "surface",
      "card",
      "cardHover",
      "text",
      "muted",
      "border",
    ],
  },
  {
    title: "Status and feedback",
    keys: ["success", "danger", "warning", "barMuted", "flame"],
  },
  {
    title: "Answers and podium",
    keys: [
      "answer1",
      "answer2",
      "answer3",
      "answer4",
      "answer5",
      "answer6",
      "gold",
      "silver",
      "bronze",
      "onMedal",
    ],
  },
];
function Editor() {
  const { branding, preview, setPreview } = useBranding();
  const cache = useQueryClient();
  const [draft, setDraft] = useState<ThemeSettings>({
    light: branding.light,
    dark: branding.dark,
  });
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => () => setPreview(null), [setPreview]);
  const parsed = themeSettingsSchema.safeParse(draft);
  function change(key: ThemeColor, value: string) {
    const next = { ...draft, [mode]: { ...draft[mode], [key]: value } };
    setDraft(next);
    if (preview && themeSettingsSchema.safeParse(next).success)
      setPreview(next);
  }
  async function saveColors() {
    if (!parsed.success) {
      toast.error("Use six-digit HEX colors in both themes");
      return;
    }
    setBusy(true);
    try {
      const { data } = await getAuthApiClient().patch<Branding>(
        "/branding",
        parsed.data,
      );
      cache.setQueryData(BRANDING_QUERY_KEY, data);
      setPreview(null);
      toast.success("Theme colors saved for the platform");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function logo(remove: boolean) {
    if (!remove && !file) return;
    setBusy(true);
    try {
      const body = new FormData();
      if (file) body.append("file", file);
      const { data } = remove
        ? await getAuthApiClient().delete<Branding>("/branding/logo")
        : await getAuthApiClient().post<Branding>("/branding/logo", body);
      cache.setQueryData(BRANDING_QUERY_KEY, data);
      setFile(null);
      if (input.current) input.current.value = "";
      toast.success(
        remove ? "Original logo restored" : "Platform logo updated",
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  const buttonClass =
    "rounded-lg border border-theme-border px-3 py-2 text-sm disabled:opacity-50";
  return (
    <fieldset disabled={busy} className="flex flex-col gap-5 mt-4">
      <p className="text-sm text-theme-muted">
        Colors and logo apply to everyone. Preview affects only this browser
        until you save.
      </p>
      <div className="flex gap-2" role="group" aria-label="Palette to edit">
        {(["light", "dark"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => setMode(value)}
            className={`${buttonClass} ${mode === value ? "bg-theme-primary text-theme-onPrimary" : ""}`}
          >
            {value === "light" ? "Light palette" : "Dark palette"}
          </button>
        ))}
      </div>
      {GROUPS.map((group) => (
        <details
          key={group.title}
          open={group.title === "Brand and buttons"}
          className="rounded-xl border border-theme-border p-3"
        >
          <summary className="font-semibold cursor-pointer">
            {group.title}
          </summary>
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            {group.keys.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={`hex-${mode}-${key}`} className="text-sm">
                  {THEME_COLORS[key]}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label={`${THEME_COLORS[key]} color picker`}
                    value={
                      /^#[0-9a-fA-F]{6}$/.test(draft[mode][key])
                        ? draft[mode][key]
                        : "#000000"
                    }
                    onChange={(e) => change(key, e.target.value)}
                    className="h-10 w-12 cursor-pointer"
                  />
                  <input
                    id={`hex-${mode}-${key}`}
                    value={draft[mode][key]}
                    onChange={(e) => change(key, e.target.value)}
                    maxLength={7}
                    spellCheck={false}
                    aria-invalid={!/^#[0-9a-fA-F]{6}$/.test(draft[mode][key])}
                    className="w-28 rounded-lg border border-theme-border bg-theme-card text-theme-text p-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </details>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={!parsed.success}
          onClick={() => setPreview(parsed.success ? parsed.data : null)}
        >
          Preview colors
        </button>
        <button
          type="button"
          className={`${buttonClass} bg-theme-primary text-theme-onPrimary`}
          disabled={!parsed.success}
          onClick={saveColors}
        >
          {busy ? "Saving…" : "Save colors"}
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setDraft({ light: branding.light, dark: branding.dark });
            setPreview(null);
          }}
        >
          Cancel changes
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            setDraft({
              light: DEFAULT_BRANDING.light,
              dark: DEFAULT_BRANDING.dark,
            });
            setPreview(null);
          }}
        >
          Load original colors
        </button>
      </div>
      {preview && (
        <p role="status" className="text-sm">
          Preview active. Switch light/dark mode above to check both palettes.
          Save to publish.
        </p>
      )}
      {!parsed.success && (
        <p role="alert" className="text-sm">
          Each color must use six hexadecimal digits, for example #7d49f8.
        </p>
      )}
      <div className="border-t border-theme-border pt-4 flex flex-col gap-3">
        <h3 className="font-semibold">Platform logo</h3>
        <p className="text-sm text-theme-muted">
          Used in navigation, sign-in and player screens. A transparent PNG
          works well in both themes.
        </p>
        <Image
          src={branding.logoUrl ?? "/images/logo.svg"}
          alt="Current platform logo"
          width={180}
          height={90}
          unoptimized
          className="h-24 w-48 object-contain"
        />
        <label className="text-sm">
          Choose logo image
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block mt-2"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={!file}
            onClick={() => logo(false)}
          >
            Upload logo
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={!branding.logoUrl}
            onClick={() => logo(true)}
          >
            Restore original logo
          </button>
        </div>
      </div>
    </fieldset>
  );
}
export default function BrandingSettings() {
  const role = useCurrentRole();
  const { loading, error, branding } = useBranding();
  return (
    <details className="rounded-xl border border-theme-border p-4 text-theme-text">
      <summary className="font-semibold cursor-pointer">
        Customize platform colors and logo
      </summary>
      {role !== "admin" && role !== "superadmin" ? (
        <p className="mt-3 text-sm">
          An admin or superadmin can change the global platform theme.
        </p>
      ) : loading ? (
        <p>Loading theme…</p>
      ) : error ? (
        <p role="alert">
          Could not load the theme. Refresh this page to try again.
        </p>
      ) : (
        <Editor key={JSON.stringify([branding.light, branding.dark])} />
      )}
    </details>
  );
}
