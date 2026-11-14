"use client";

import clsx from "clsx";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { primaryButtonClass } from "@/components/Game/GameUI";
import { useQuestionsQuery } from "@/lib/modules/questions/hooks";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { HideQuestions, setHideQuestions } from "@/state/hideQuestionsSlice";

/** Two stacked question cards with an "eye off" badge — answers under wraps. */
function HiddenCardsIllustration() {
  return (
    <div className="relative mx-auto h-[156px] w-[224px]" aria-hidden>
      <svg viewBox="0 0 170 118" className="size-full">
        {/* back card */}
        <g transform="rotate(-8 85 59)">
          <rect
            x="34"
            y="14"
            width="112"
            height="86"
            rx="14"
            className="fill-theme-primary/15 dark:fill-theme-primary/15"
          />
        </g>
        {/* front card */}
        <rect
          x="24"
          y="20"
          width="116"
          height="88"
          rx="14"
          strokeWidth="1.5"
          className="fill-theme-muted dark:fill-theme-muted stroke-theme-primary/25 dark:stroke-theme-border/10"
        />
        {/* question title */}
        <rect
          x="38"
          y="34"
          width="62"
          height="8"
          rx="4"
          className="fill-theme-primary/50 dark:fill-theme-primary/50"
        />
        <rect
          x="38"
          y="47"
          width="40"
          height="6"
          rx="3"
          className="fill-theme-primary/20 dark:fill-theme-muted/15"
        />
        {/* answer options */}
        {[
          [38, 62],
          [84, 62],
          [38, 82],
          [84, 82],
        ].map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="42"
            height="14"
            rx="5"
            className="fill-theme-primary/10 dark:fill-theme-muted/5"
          />
        ))}
        {/* sparkle accents */}
        <path
          d="M18 18c.5 4 2.5 6 6.5 6.5-4 .5-6 2.5-6.5 6.5-.5-4-2.5-6-6.5-6.5 4-.5 6-2.5 6.5-6.5Z"
          className="fill-theme-warning"
        />
        <circle
          cx="152"
          cy="16"
          r="3"
          className="fill-theme-primary/40 dark:fill-theme-primary/40"
        />
      </svg>
      <span className="absolute right-0 bottom-0 flex size-16 items-center justify-center rounded-full bg-linear-to-br from-theme-accent to-theme-accentDeep dark:from-theme-accent dark:to-theme-accentDeep text-theme-onAccent shadow-[0_10px_24px_-10px_var(--color-theme-accentDeep)] ring-4 ring-theme-border dark:ring-theme-border">
        <LuEyeOff size={28} />
      </span>
    </div>
  );
}

/**
 * Sits over the blurred question list while questions are hidden, so the host
 * can reveal them right where they're looking, not just from the toolbar
 * switch (which re-hides them).
 *
 * Render it in a `relative` box wrapping the *scrolling* question panel, not
 * inside the list: there it is centred in what's visible however far the list
 * is scrolled, on short lists too. Where the page itself scrolls (mobile) the
 * sticky band keeps it centred on screen.
 */
export default function HiddenQuestionsOverlay({ quizId }: { quizId: string }) {
  const dispatch = useAppDispatch();
  const visibility = useAppSelector((state) => state.hideQuestions.visibility);
  const { data } = useQuestionsQuery(quizId);

  if (visibility !== HideQuestions.hide || !data?.questions.length) {
    return null;
  }

  return (
    // pointer-events-none: the panel's toolbar (add question, hide switch)
    // stays usable under the overlay's empty area. z-[5]: above the list,
    // below the mobile info drawer (z-20) and its backdrop (z-10).
    <div className="pointer-events-none absolute inset-0 z-[5] px-4">
      {/* pt-16 leaves the sticky toolbar out of the centring. */}
      <div className="sticky top-0 h-full max-h-dvh pt-16 flex items-center justify-center">
        <div className="pointer-events-auto w-full max-w-md flex flex-col items-center gap-5 rounded-[26px] border border-theme-primary/15 dark:border-theme-border/5 bg-theme-surface/90 dark:bg-theme-surface/90 backdrop-blur-sm px-8 py-10 text-center shadow-[0_24px_48px_-24px_rgba(0,0,0,0.45)] animate-pop-in">
          <HiddenCardsIllustration />
          <div>
            <h3 className="text-2xl font-bold tracking-[-0.01em] text-theme-text dark:text-theme-text">
              Questions are hidden
            </h3>
            <p className="mt-1.5 text-[15px] text-theme-text/70 dark:text-theme-muted">
              Handy when your screen is shared, so no one peeks at the answers.
            </p>
          </div>
          <button
            type="button"
            className={clsx(primaryButtonClass, "mt-1")}
            onClick={() => dispatch(setHideQuestions(HideQuestions.show))}
          >
            <LuEye size={20} />
            Reveal questions
          </button>
        </div>
      </div>
    </div>
  );
}
