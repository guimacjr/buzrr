import { LuArrowRight } from "react-icons/lu";
import LandingNavbar from "./LandingNavbar";
import LandingFooter from "./LandingFooter";

interface ComingSoonProps {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

const ComingSoon = ({
  title,
  description,
  ctaLabel,
  ctaHref,
}: ComingSoonProps) => {
  return (
    <div className="min-h-dvh flex flex-col bg-theme-background dark:bg-theme-background">
      <LandingNavbar />
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 animate-fade-up">
        <span className="rounded-full border border-theme-primary/30 dark:border-theme-primary/30 bg-theme-primary/10 dark:bg-theme-primary/10 px-3 py-1 text-xs font-bold text-theme-primary dark:text-theme-primary">
          Coming Soon
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl font-black text-theme-text dark:text-theme-text">
          {title}
        </h1>
        <p className="mt-4 max-w-md text-theme-text/70 dark:text-theme-muted">
          {description}
        </p>
        <a
          href={ctaHref}
          target="_blank"
          rel="noreferrer"
          className="mt-8 flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-theme-primary dark:bg-theme-primary text-theme-onPrimary dark:text-theme-onPrimary hover:opacity-90 transition-opacity"
        >
          {ctaLabel}
          <LuArrowRight size={16} />
        </a>
      </main>
      <LandingFooter />
    </div>
  );
};

export default ComingSoon;
