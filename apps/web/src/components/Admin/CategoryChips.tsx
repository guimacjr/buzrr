"use client";

import clsx from "clsx";
import { MAX_QUESTION_CATEGORIES } from "@buzrr/contract";
import { useCategoriesQuery } from "@/lib/modules/categories/hooks";
import { categorySwatch } from "@/components/Duel/duelUi";

/**
 * Toggle chips for tagging a question with up to MAX_QUESTION_CATEGORIES
 * categories. A question may have none.
 */
export default function CategoryChips({
  value,
  onChange,
  disabled = false,
}: {
  value: string[];
  onChange: (categoryIds: string[]) => void;
  disabled?: boolean;
}) {
  const { data: categories, isPending } = useCategoriesQuery();
  if (isPending) {
    return (
      <p className="text-xs text-theme-muted dark:text-theme-muted">Loading…</p>
    );
  }
  if (!categories?.length) {
    return (
      <p className="text-xs text-theme-muted dark:text-theme-muted">
        No categories yet.
      </p>
    );
  }
  const full = value.length >= MAX_QUESTION_CATEGORIES;

  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => {
        const on = value.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            disabled={disabled || (!on && full)}
            onClick={() =>
              onChange(
                on ? value.filter((id) => id !== c.id) : [...value, c.id],
              )
            }
            className={clsx(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors disabled:cursor-default disabled:opacity-40",
              on
                ? "border-theme-primary bg-theme-card text-theme-primary dark:border-theme-primary dark:bg-theme-card dark:text-theme-primary"
                : "border-theme-primary/15 text-theme-muted hover:border-theme-primary/40 dark:border-theme-border/10 dark:text-theme-muted",
            )}
          >
            <span
              className="h-2 w-2 rounded-[3px]"
              style={{ background: categorySwatch(c.hue) }}
            />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
