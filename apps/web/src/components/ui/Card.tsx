"use client";

import clsx from "clsx";

/**
 * The card frame used across the app, promoted out of the local `SettingsCard`
 * in `Admin/Settings/SettingsClient.tsx` so the AI section doesn't fork it again.
 */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={clsx(
        "bg-theme-surface dark:bg-theme-card rounded-xl p-4 md:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-black text-theme-text dark:text-theme-text truncate">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-theme-muted dark:text-theme-muted mt-1">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-theme-border border-dashed rounded-lg p-6 text-center text-theme-text dark:text-theme-text">
      <p className="text-lg font-black">{title}</p>
      {hint && (
        <p className="text-sm mt-2 text-theme-muted dark:text-theme-muted">
          {hint}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
