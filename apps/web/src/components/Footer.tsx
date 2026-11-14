"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";

// Routes that render their own full footer + theme toggle (landing & co).
const ROUTES_WITH_OWN_FOOTER = ["/", "/docs", "/support", "/pricing"];

// Route prefixes where the bar is hidden on every subpage: the checkout flow,
// and the marketing + legal pages in app/(marketing), which render LandingFooter.
const PREFIXES_WITHOUT_FOOTER = [
  "/billing/",
  "/alternatives",
  "/compare/",
  "/use-cases",
  "/open-source-quiz-platform",
  "/self-hosted-quiz",
  "/privacy",
  "/terms",
  "/refund-policy",
];

const Footer = () => {
  const pathname = usePathname();
  if (
    ROUTES_WITH_OWN_FOOTER.includes(pathname) ||
    PREFIXES_WITHOUT_FOOTER.some((prefix) => pathname.startsWith(prefix))
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-3 md:right-0 md:left-0 z-50 w-fit md:w-full md:bg-theme-background md:dark:bg-theme-background">
      <div className="max-w-7xl mx-auto flex items-center justify-start p-2 px-4 sm:px-6 lg:px-8 text-sm text-theme-muted dark:text-theme-muted">
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default Footer;
