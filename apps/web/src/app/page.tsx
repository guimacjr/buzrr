import Link from "next/link";
import {
  LuBot,
  LuChartColumn,
  LuDoorOpen,
  LuGitCommitHorizontal,
  LuGitPullRequest,
  LuGithub,
  LuHeart,
  LuPlay,
  LuScale,
  LuServer,
  LuSmartphone,
  LuSparkles,
  LuStar,
  LuSwords,
  LuUsers,
  LuZap,
} from "react-icons/lu";
import LandingNavbar from "@/components/Landing/LandingNavbar";
import LandingFooter from "@/components/Landing/LandingFooter";
import HeroVisual from "@/components/Landing/HeroVisual";
import LandingVideo from "@/components/Landing/LandingVideo";
import { GITHUB_LINK } from "@/components/Landing/links";
import { getGithubStats } from "@/lib/github-stats";
import { JsonLd, LinkCards } from "@/components/Marketing/primitives";
import {
  OPEN_SOURCE_CARD,
  SELF_HOST_CARD,
  WhatIsBuzrr,
  cardsForUseCases,
} from "@/components/Marketing/product";
import { siteGraph, webPageSchema } from "@/lib/seo/json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { DEFAULT_TITLE, SITE_DESCRIPTION } from "@/lib/seo/site";

export const metadata = buildPageMetadata({
  title: DEFAULT_TITLE,
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

const heroBadges = [
  { icon: <LuUsers size={13} />, label: "Contributors Welcome" },
  { icon: <LuScale size={13} />, label: "AGPL-3.0 License" },
  { icon: null, label: "TypeScript" },
  { icon: null, label: "Next.js" },
  { icon: null, label: "NestJS" },
];

const features = [
  {
    icon: LuZap,
    title: "Realtime Multiplayer",
    text: "Host live rooms players join with a code.",
  },
  {
    icon: LuBot,
    title: "AI Quiz Generator",
    text: "Generate whole quizzes instantly with Gemini.",
  },
  {
    icon: LuSwords,
    title: "Ranked 1v1 Duels",
    text: "Challenge others in ELO-ranked matches.",
  },
  {
    icon: LuChartColumn,
    title: "Live Results",
    text: "Instant scoring, charts and leaderboards.",
  },
  {
    icon: LuServer,
    title: "Self Host",
    text: "Deploy your own instance, AGPL-3.0 licensed.",
  },
  {
    icon: LuSmartphone,
    title: "Mobile Friendly",
    text: "Play on any device, anywhere.",
  },
];

const formatStat = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("en-US");

export default async function Home() {
  const stats = await getGithubStats();

  const statTiles = [
    {
      icon: LuUsers,
      value: formatStat(stats.contributors),
      label: "Contributors",
    },
    {
      icon: LuGitCommitHorizontal,
      value: formatStat(stats.commits),
      label: "Commits",
    },
    {
      icon: LuGitPullRequest,
      value: formatStat(stats.mergedPRs),
      label: "PRs Merged",
    },
    { icon: LuStar, value: formatStat(stats.stars), label: "GitHub Stars" },
  ];

  return (
    <div className="min-h-dvh bg-theme-background dark:bg-theme-background">
      <JsonLd
        nodes={[
          ...siteGraph(),
          webPageSchema({
            path: "/",
            title: DEFAULT_TITLE,
            description: SITE_DESCRIPTION,
          }),
        ]}
      />
      <LandingNavbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="flex flex-col xl:flex-row items-center gap-12 xl:gap-16 pt-14 pb-16 sm:pt-20">
          <div className="flex flex-col items-center xl:items-start text-center xl:text-left max-w-2xl animate-fade-up">
            <span className="flex items-center gap-1.5 rounded-full border border-theme-primary/30 dark:border-theme-primary/30 bg-theme-primary/10 dark:bg-theme-primary/10 px-3 py-1 text-xs font-bold text-theme-primary dark:text-theme-primary">
              <LuSparkles size={13} />
              Open Source
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-black text-theme-text dark:text-theme-text leading-tight">
              Build quizzes.
              <br />
              <span className="text-theme-primary dark:text-theme-primary">
                Battle
              </span>{" "}
              friends.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-theme-text/70 dark:text-theme-muted max-w-md">
              Open-source multiplayer quiz platform for classrooms, communities
              and friends.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link
                href="/duel"
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-xl text-lg font-black bg-theme-primary dark:bg-theme-primary text-theme-onPrimary dark:text-theme-onPrimary hover:opacity-90 transition-opacity"
              >
                <LuPlay size={18} />
                Start 1v1
              </Link>
              <Link
                href="/player"
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-xl text-lg font-black border-2 border-theme-primary dark:border-theme-primary text-theme-primary dark:text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-theme-primary/10 transition-colors"
              >
                <LuDoorOpen size={18} />
                Join Room
              </Link>
            </div>

            <Link
              href="/admin"
              className="mt-4 text-sm text-theme-text/60 dark:text-theme-muted hover:text-theme-primary dark:hover:text-theme-primary transition-colors underline underline-offset-4"
            >
              or create and host your own quiz →
            </Link>

            <div className="mt-8 flex flex-wrap justify-center xl:justify-start gap-2">
              {heroBadges.map((badge) => (
                <span
                  key={badge.label}
                  className="flex items-center gap-1.5 rounded-lg border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface px-3 py-1.5 text-xs font-semibold text-theme-text dark:text-theme-muted"
                >
                  {badge.icon && (
                    <span className="text-theme-primary dark:text-theme-primary">
                      {badge.icon}
                    </span>
                  )}
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full max-w-md xl:max-w-lg shrink-0">
            <HeroVisual />
          </div>
        </section>

        {/* Features */}
        <section className="py-14">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-theme-text dark:text-theme-text">
            Everything you need
          </h2>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center gap-2 rounded-xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface p-5 hover:border-theme-primary/40 dark:hover:border-theme-primary/40 hover:-translate-y-0.5 transition-all"
              >
                <feature.icon
                  className="text-theme-primary dark:text-theme-primary"
                  size={22}
                />
                <h3 className="text-sm font-bold text-theme-text dark:text-theme-text">
                  {feature.title}
                </h3>
                <p className="text-xs text-theme-text/60 dark:text-theme-muted">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* What is Buzrr + where it fits (internal links to the SEO pages) */}
        <section className="py-14 max-w-5xl mx-auto">
          <WhatIsBuzrr />
          <LandingVideo />
          <h2 className="mt-14 text-center text-2xl sm:text-3xl font-black text-theme-text dark:text-theme-text">
            What people use Buzrr for
          </h2>
          <div className="mt-8">
            <LinkCards
              items={cardsForUseCases([
                "classroom-quizzes",
                "college-events",
                "corporate-training",
                "team-building",
                "pub-trivia",
                "live-audience-quizzes",
              ])}
            />
          </div>
          <div className="mt-4">
            <LinkCards
              items={[
                {
                  href: "/alternatives",
                  title:
                    "Alternatives to Kahoot, Wayground (Quizizz), Slido and Mentimeter",
                  text: "How Buzrr compares, with sources — and when another tool fits better.",
                },
                OPEN_SOURCE_CARD,
                SELF_HOST_CARD,
              ]}
            />
          </div>
        </section>

        {/* Built in Public */}
        <section className="py-14">
          <h2 className="text-center text-2xl sm:text-3xl font-black text-theme-text dark:text-theme-text">
            Built in Public
          </h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 rounded-xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface divide-x divide-y md:divide-y-0 divide-theme-card dark:divide-theme-border overflow-hidden">
            {statTiles.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 p-6"
              >
                <span className="flex items-center gap-2 text-xl sm:text-2xl font-black text-theme-primary dark:text-theme-primary">
                  <stat.icon size={20} />
                  {stat.value}
                </span>
                <span className="text-xs sm:text-sm text-theme-text/60 dark:text-theme-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* GitHub CTA */}
        <section className="pb-16">
          <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface p-6 sm:p-8">
            <div className="flex items-center justify-center size-14 shrink-0 rounded-full bg-theme-card dark:bg-theme-card text-theme-text dark:text-theme-text">
              <LuGithub size={26} />
            </div>
            <div className="text-center sm:text-left">
              <p className="font-bold text-theme-text dark:text-theme-text">
                Buzrr is open source and contributor friendly.
              </p>
              <p className="text-sm text-theme-text/60 dark:text-theme-muted">
                Free software under AGPL-3.0 — we welcome contributions from
                everyone. Check out our repo!
              </p>
            </div>
            <a
              href={GITHUB_LINK}
              target="_blank"
              rel="noreferrer"
              className="sm:ml-auto flex items-center gap-2 px-6 py-3 rounded-xl font-bold border-2 border-theme-primary dark:border-theme-primary text-theme-primary dark:text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-theme-primary/10 transition-colors"
            >
              <LuStar size={16} />
              Star on GitHub
            </a>
          </div>
        </section>

        {/* Support CTA */}
        <section className="pb-16">
          <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface p-6 sm:p-8">
            <Link
              href="/support"
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-theme-primary dark:bg-theme-primary text-theme-onPrimary dark:text-theme-onPrimary hover:opacity-90 transition-opacity"
            >
              <LuHeart size={16} className="fill-current" />
              Donate Us
            </Link>
            <div className="text-center sm:text-left">
              <p className="font-bold text-theme-text dark:text-theme-text">
                Enjoying Buzrr? Help keep it running.
              </p>
              <p className="text-sm text-theme-text/60 dark:text-theme-muted">
                Donations cover servers and chai — always optional, never
                required.
              </p>
            </div>
            <div className="sm:ml-auto hidden sm:flex items-center justify-center size-14 shrink-0 rounded-full bg-theme-card dark:bg-theme-card text-theme-primary dark:text-theme-primary">
              <LuHeart size={26} className="fill-current" />
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
