"use client";

import { LuTrophy, LuZap } from "react-icons/lu";
import ClientImage from "@/components/ClientImage";

/**
 * The existing dashboard illustration framed in a card, with small floating
 * chips around it. Chips bob on offset cycles so the scene feels alive
 * without pulling focus from the CTAs.
 */
const HeroVisual = () => {
  return (
    <div className="relative animate-fade-up [animation-delay:200ms]">
      <div
        aria-hidden
        className="absolute -inset-4 rounded-3xl bg-theme-primary/15 dark:bg-theme-primary/15 blur-2xl"
      />
      <div className="relative rounded-2xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface p-4 sm:p-6 shadow-xl animate-float-slow">
        <ClientImage
          props={{
            src: "/images/landing-page.svg",
            darksrc: "/images/landing-page-dark.svg",
            alt: "Buzrr live games dashboard preview",
            width: 448,
            height: 270,
            classname: "w-full h-auto max-w-md",
          }}
        />
      </div>

      <div className="absolute -top-3 -right-2 sm:-right-4 flex items-center gap-1.5 rounded-full bg-theme-surface dark:bg-theme-surface border border-theme-card dark:border-theme-border px-3 py-1.5 text-xs font-bold text-theme-text dark:text-theme-text shadow-lg animate-float">
        <LuZap
          className="text-theme-primary dark:text-theme-primary"
          size={14}
        />
        Live
      </div>
      <div className="absolute -bottom-3 -left-2 sm:-left-4 flex items-center gap-1.5 rounded-full bg-theme-surface dark:bg-theme-surface border border-theme-card dark:border-theme-border px-3 py-1.5 text-xs font-bold text-theme-text dark:text-theme-text shadow-lg animate-float [animation-delay:1.2s]">
        <LuTrophy
          className="text-theme-primary dark:text-theme-primary"
          size={14}
        />
        +24 ELO
      </div>
    </div>
  );
};

export default HeroVisual;
