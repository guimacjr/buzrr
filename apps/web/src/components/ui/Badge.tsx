"use client";

import clsx from "clsx";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

/**
 * Pill label. The tone palette matches `StatusPill` in
 * `Admin/Moderation/ModerationQueueClient.tsx` so moderation states and
 * ingestion states read the same way.
 */
const TONES: Record<BadgeTone, string> = {
  neutral: "bg-theme-border/20 text-theme-muted dark:text-theme-muted",
  info: "bg-theme-primary/15 text-theme-primary dark:bg-theme-primary/20 dark:text-theme-primary",
  success: "bg-theme-success/20 text-theme-success",
  warning: "bg-theme-warning/20 text-theme-warning",
  danger:
    "bg-theme-danger/20 dark:bg-theme-danger/20 text-theme-danger dark:text-theme-danger",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
