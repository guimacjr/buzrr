"use client";
import { useAppSelector } from "@/state/hooks";
import type { ConnectionStatus } from "@/types/socket";

const STATUS: Record<
  ConnectionStatus,
  { label: string; dot: string; pulse: boolean }
> = {
  connecting: { label: "Connecting…", dot: "bg-theme-warning", pulse: true },
  connected: { label: "Live", dot: "bg-theme-success", pulse: false },
  reconnecting: {
    label: "Reconnecting…",
    dot: "bg-theme-warning",
    pulse: true,
  },
  disconnected: { label: "Offline", dot: "bg-theme-danger", pulse: false },
};

/**
 * Small always-visible socket status indicator, complementing
 * ConnectionBanner (which only appears once the connection degrades).
 */
export default function ConnectionStatusPill({
  className = "",
}: {
  className?: string;
}) {
  const connection = useAppSelector((state) => state.game.connection);
  const { label, dot, pulse } = STATUS[connection];

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full border border-stone-300 dark:border-stone-600 bg-theme-surface/90 dark:bg-theme-surface/90 px-3 py-1 text-xs font-bold text-theme-text dark:text-theme-text shadow-sm ${className}`}
    >
      <span
        className={`h-2 w-2 rounded-full ${dot} ${pulse ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
