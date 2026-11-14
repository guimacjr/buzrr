"use client";

import clsx from "clsx";
import { useId, type ReactNode } from "react";
import ConnectionStatusPill from "@/components/ConnectionStatusPill";

export const OPTION_KEYS = ["A", "B", "C", "D", "E", "F"];
export const OPTION_COLORS = [
  "var(--color-theme-answer1)",
  "var(--color-theme-answer2)",
  "var(--color-theme-answer3)",
  "var(--color-theme-answer4)",
  "var(--color-theme-answer5)",
  "var(--color-theme-answer6)",
];

export const panelClass =
  "rounded-3xl border bg-theme-surface dark:bg-theme-surface border-theme-primary/15 dark:border-theme-border/5";
export const subtleCardClass =
  "border bg-theme-background dark:bg-theme-card border-theme-primary/15 dark:border-theme-border/5";
export const labelClass =
  "text-xs font-semibold tracking-[0.12em] uppercase text-theme-muted dark:text-theme-muted";
export const mutedText = "text-theme-muted dark:text-theme-muted";
export const inputClass =
  "w-full rounded-[14px] border-[1.5px] bg-theme-background dark:bg-theme-card border-theme-primary/15 dark:border-theme-border/10 px-4 py-[15px] text-base text-theme-text dark:text-theme-text placeholder:text-theme-muted dark:placeholder:text-theme-muted outline-none transition-[border-color,box-shadow] focus:border-theme-primary focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-theme-primary)_15%,transparent)]";

export const fieldLabelClass =
  "flex items-center justify-between text-sm font-semibold";

export const counterClass =
  "text-[12.5px] font-medium text-theme-muted dark:text-theme-muted";

export const primaryButtonClass =
  "flex items-center justify-center gap-2.5 whitespace-nowrap rounded-[14px] px-[30px] py-3.5 text-base font-bold text-theme-onAccent bg-linear-to-br from-theme-accent to-theme-accentDeep dark:from-theme-accent dark:to-theme-accentDeep shadow-[0_10px_24px_-10px_var(--color-theme-accentDeep)] transition-[filter,transform] hover:brightness-108 active:translate-y-px cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:brightness-100";

export function OptionKey({
  index,
  className,
}: {
  index: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "shrink-0 flex items-center justify-center rounded-xl font-extrabold text-theme-onPrimary",
        className,
      )}
      style={{ background: OPTION_COLORS[index % OPTION_COLORS.length] }}
    >
      {OPTION_KEYS[index % OPTION_KEYS.length]}
    </span>
  );
}

function Progress({
  qIndex,
  qCount,
  final,
}: {
  qIndex: number;
  qCount: number;
  final?: boolean;
}) {
  const current = qIndex + 1;
  const segmented = qCount <= 15;
  return (
    <div
      className={clsx(
        "flex items-center gap-3.5 rounded-[14px] border px-3.5 py-[7px] bg-theme-surface dark:bg-theme-surface border-theme-primary/15 dark:border-theme-border/5",
        "flex-1 min-w-0 md:flex-none md:justify-start",
      )}
    >
      <span className="text-[13.5px] font-semibold whitespace-nowrap">
        {final ? (
          <>
            Quiz{" "}
            <b className="text-theme-primary dark:text-theme-primary">
              concluído
            </b>
          </>
        ) : (
          <>
            Pergunta{" "}
            <b className="text-theme-primary dark:text-theme-primary">
              {current}
            </b>{" "}
            de {qCount}
          </>
        )}
      </span>
      {segmented && (
        <span className="hidden md:flex gap-1" aria-hidden="true">
          {Array.from({ length: qCount }, (_, i) => (
            <i
              key={i}
              className={clsx(
                "h-1.5 rounded",
                final || i + 1 < current
                  ? "w-3 md:w-[18px] bg-theme-primary/55"
                  : i + 1 === current
                    ? "w-5 md:w-7 bg-linear-to-br from-theme-accent to-theme-accentDeep dark:from-theme-accent dark:to-theme-accentDeep"
                    : "w-3 md:w-[18px] bg-theme-primary/10 dark:bg-theme-surface/10",
              )}
            />
          ))}
        </span>
      )}
      {/* Continuous bar on mobile (and on desktop for long quizzes). */}
      <span
        className={clsx(
          "h-1.5 flex-1 md:flex-none md:w-28 rounded bg-theme-primary/10 dark:bg-theme-surface/10 overflow-hidden",
          segmented && "md:hidden",
        )}
        aria-hidden="true"
      >
        <i
          className="block h-full rounded bg-linear-to-br from-theme-accent to-theme-accentDeep dark:from-theme-accent dark:to-theme-accentDeep"
          style={{ width: `${final ? 100 : (current / qCount) * 100}%` }}
        />
      </span>
      <span
        className={clsx(
          "hidden md:inline text-[12.5px] whitespace-nowrap",
          mutedText,
        )}
      >
        {final
          ? `${qCount} de ${qCount}`
          : `${qCount - current} restante${qCount - current === 1 ? "" : "s"}`}
      </span>
    </div>
  );
}

export function GameTopBar({
  title,
  qIndex,
  qCount,
  final,
  right,
  gameCode,
}: {
  title: string;
  qIndex: number;
  qCount: number;
  final?: boolean;
  right?: ReactNode;
  /** Shown as a small chip beside the connection pill, for late joiners. */
  gameCode?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 md:gap-[18px] py-2 md:py-[18px] shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <ConnectionStatusPill className="!shadow-none !text-[13px] !font-semibold !px-3 !py-1.5 !border-theme-primary/15 dark:!border-theme-border/10 !bg-theme-surface dark:!bg-theme-surface/5" />
        {gameCode && (
          <span
            title="Código da partida"
            className="rounded-full border border-theme-primary/15 dark:border-theme-border/10 bg-theme-surface dark:bg-theme-surface/5 px-3 py-1.5 text-[13px] font-semibold"
          >
            <span className={clsx("mr-1.5 font-medium", mutedText)}>
              Código
            </span>
            <b className="font-extrabold tracking-[0.1em] text-theme-primary dark:text-theme-primary">
              {gameCode}
            </b>
          </span>
        )}
      </div>
      <h1 className="hidden md:block flex-1 min-w-0 text-2xl font-bold tracking-[-0.01em] truncate">
        {title}
      </h1>
      {qCount > 0 && <Progress qIndex={qIndex} qCount={qCount} final={final} />}
      {right}
    </div>
  );
}

export function TimerRing({
  value,
  max,
  label = "seconds",
  className,
  valueClassName,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
  valueClassName?: string;
}) {
  // Unique per ring: a shared id would bind every ring to the first gradient.
  const gradientId = `ring-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const r = 44;
  const c = 2 * Math.PI * r;
  const low = value <= 5;
  const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className={clsx("relative shrink-0", className)}>
      <svg viewBox="0 0 100 100" className="block size-full -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1">
            <stop offset="0" stopColor="var(--color-theme-primary)" />
            <stop offset="1" stopColor="var(--color-theme-accentDeep)" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="7"
          className="stroke-theme-primary/10 dark:stroke-theme-border/10"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke={low ? "var(--color-theme-danger)" : `url(#${gradientId})`}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <b
          className={clsx(
            "font-extrabold leading-none tracking-[-0.03em]",
            low && "text-theme-danger",
            valueClassName,
          )}
        >
          {value}
        </b>
        {label && (
          <span className={clsx("text-[13px] font-medium mt-1", mutedText)}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

/** Horizontal countdown bar — compact alternative to `TimerRing`. */
export function TimerBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const low = value <= 5;
  const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      role="timer"
      aria-label={`${Math.ceil(value)} segundos restantes`}
      className={clsx("flex items-center gap-3", className)}
    >
      <span className="flex-1 h-2.5 rounded-full overflow-hidden bg-theme-primary/10 dark:bg-theme-surface/10">
        <i
          className={clsx(
            "block h-full rounded-full transition-[width,background-color] duration-250 ease-linear",
            low
              ? "bg-theme-danger"
              : "bg-linear-to-r from-theme-primary to-theme-accentDeep",
          )}
          style={{ width: `${frac * 100}%` }}
        />
      </span>
      <b
        className={clsx(
          "w-9 text-right text-lg font-extrabold tabular-nums leading-none",
          low && "text-theme-danger",
        )}
      >
        {Math.ceil(value)}s
      </b>
    </div>
  );
}

export function StatTile({
  value,
  suffix,
  label,
  className,
}: {
  value: ReactNode;
  suffix?: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl px-3 py-2.5 md:px-4 md:py-3.5",
        subtleCardClass,
        className,
      )}
    >
      <b className="block text-xl md:text-[26px] font-bold tracking-[-0.02em] leading-[1.1]">
        {value}
        {suffix && (
          <small className={clsx("text-[15px] font-semibold", mutedText)}>
            {suffix}
          </small>
        )}
      </b>
      <span className={clsx("text-[12.5px]", mutedText)}>{label}</span>
    </div>
  );
}

export function WaitingDots({ children }: { children: ReactNode }) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 text-[14.5px] font-medium",
        mutedText,
      )}
    >
      {[0, 200, 400].map((delay) => (
        <i
          key={delay}
          className="size-2 rounded-full bg-theme-primary animate-pulse"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
      {children}
    </div>
  );
}

export function ordinal(n: number) {
  return `${n}º`;
}
