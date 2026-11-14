import Link from "next/link";
import { LuArrowRight, LuChevronRight } from "react-icons/lu";
import {
  breadcrumbSchema,
  serializeJsonLd,
  type Crumb,
  type Faq,
} from "@/lib/seo/json-ld";

/**
 * Server-only building blocks for the SEO/marketing pages under
 * `app/(marketing)`. They ship no client JavaScript; styling follows the
 * landing page (tokens from globals.css, both themes styled by hand).
 */

export function JsonLd({ nodes }: { nodes: Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(nodes) }}
    />
  );
}

/** Visible breadcrumb trail. Pair with `breadcrumbSchema` in the page graph. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-theme-text/60 dark:text-theme-muted">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-1">
              {last ? (
                <span
                  aria-current="page"
                  className="text-theme-text dark:text-theme-text"
                >
                  {crumb.name}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.path}
                    className="hover:text-theme-primary dark:hover:text-theme-primary transition-colors"
                  >
                    {crumb.name}
                  </Link>
                  <LuChevronRight size={14} aria-hidden />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { breadcrumbSchema };

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {children}
    </div>
  );
}

interface CtaLink {
  label: string;
  href: string;
}

export function PageHero({
  crumbs,
  eyebrow,
  title,
  lead,
  primary,
  secondary,
}: {
  crumbs: Crumb[];
  eyebrow: string;
  title: string;
  lead: string;
  primary?: CtaLink;
  secondary?: CtaLink;
}) {
  return (
    <header className="pt-8 pb-10 sm:pt-10 sm:pb-12">
      <Breadcrumbs crumbs={crumbs} />
      <p className="mt-8 inline-flex rounded-full border border-theme-primary/30 dark:border-theme-primary/30 bg-theme-primary/10 dark:bg-theme-primary/10 px-3 py-1 text-xs font-bold text-theme-primary dark:text-theme-primary">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-3xl sm:text-5xl font-black text-theme-text dark:text-theme-text leading-tight max-w-3xl">
        {title}
      </h1>
      <p className="mt-5 text-base sm:text-lg text-theme-text/70 dark:text-theme-muted max-w-2xl">
        {lead}
      </p>
      {(primary || secondary) && (
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {primary && <PrimaryButton {...primary} />}
          {secondary && <SecondaryButton {...secondary} />}
        </div>
      )}
    </header>
  );
}

function isExternal(href: string) {
  return /^https?:\/\//.test(href);
}

export function PrimaryButton({ label, href }: CtaLink) {
  const className =
    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-theme-primary dark:bg-theme-primary text-theme-onPrimary dark:text-theme-onPrimary hover:opacity-90 transition-opacity";
  return isExternal(href) ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {label}
      <LuArrowRight size={16} aria-hidden />
    </a>
  ) : (
    <Link href={href} className={className}>
      {label}
      <LuArrowRight size={16} aria-hidden />
    </Link>
  );
}

export function SecondaryButton({ label, href }: CtaLink) {
  const className =
    "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold border-2 border-theme-primary dark:border-theme-primary text-theme-primary dark:text-theme-primary hover:bg-theme-primary/10 dark:hover:bg-theme-primary/10 transition-colors";
  return isExternal(href) ? (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {label}
    </a>
  ) : (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id?: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="py-10 border-t border-theme-card dark:border-theme-card"
    >
      <h2 className="text-2xl sm:text-3xl font-black text-theme-text dark:text-theme-text">
        {title}
      </h2>
      {intro && (
        <p className="mt-3 text-theme-text/70 dark:text-theme-muted max-w-3xl">
          {intro}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-4 max-w-3xl text-theme-text/80 dark:text-theme-muted leading-relaxed">
      {paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </div>
  );
}

export function PointGrid({
  points,
}: {
  points: { title: string; text: string }[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {points.map((point) => (
        <div
          key={point.title}
          className="rounded-xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface p-5"
        >
          <h3 className="font-bold text-theme-text dark:text-theme-text">
            {point.title}
          </h3>
          <p className="mt-2 text-sm text-theme-text/70 dark:text-theme-muted leading-relaxed">
            {point.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BulletList({
  items,
  tone = "neutral",
}: {
  items: string[];
  tone?: "neutral" | "positive" | "caution";
}) {
  const marker =
    tone === "positive"
      ? "bg-theme-primary dark:bg-theme-primary"
      : tone === "caution"
        ? "bg-theme-danger dark:bg-theme-danger"
        : "bg-theme-surface/40 dark:bg-theme-border";
  return (
    <ul className="space-y-2.5 max-w-3xl">
      {items.map((item) => (
        <li
          key={item}
          className="flex gap-3 text-theme-text/80 dark:text-theme-muted leading-relaxed"
        >
          <span
            aria-hidden
            className={`mt-2.5 size-1.5 shrink-0 rounded-full ${marker}`}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function Steps({
  steps,
}: {
  steps: { title?: string; text: string }[];
}) {
  return (
    <ol className="space-y-4 max-w-3xl">
      {steps.map((step, i) => (
        <li key={step.text} className="flex gap-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-theme-primary/10 dark:bg-theme-primary/10 text-sm font-black text-theme-primary dark:text-theme-primary">
            {i + 1}
          </span>
          <p className="min-w-0 pt-1 text-theme-text/80 dark:text-theme-muted leading-relaxed wrap-anywhere">
            {step.title && (
              <strong className="text-theme-text dark:text-theme-text">
                {step.title}.{" "}
              </strong>
            )}
            {step.text}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** A self-contained question and answer, as plain visible text. */
export function Answer({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-theme-primary/30 dark:border-theme-primary/30 bg-theme-primary/5 dark:bg-theme-primary/5 p-6">
      <h2 className="text-lg sm:text-xl font-black text-theme-text dark:text-theme-text">
        {question}
      </h2>
      <div className="mt-3 text-theme-text/80 dark:text-theme-muted leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/** Visible FAQ. Pair with `faqPageSchema` over the same `faqs`. */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <dl className="grid gap-4">
      {faqs.map((faq) => (
        <div
          key={faq.question}
          className="rounded-2xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface p-6"
        >
          <dt className="text-lg font-bold text-theme-text dark:text-theme-text">
            {faq.question}
          </dt>
          <dd className="mt-2 text-theme-text/80 dark:text-theme-muted leading-relaxed">
            {faq.answer}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface LinkCardItem {
  href: string;
  title: string;
  text: string;
}

export function LinkCards({ items }: { items: LinkCardItem[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="group flex h-full flex-col rounded-xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface p-5 hover:border-theme-primary/50 dark:hover:border-theme-primary/50 transition-colors"
          >
            <span className="flex items-center justify-between gap-2 font-bold text-theme-text dark:text-theme-text group-hover:text-theme-primary dark:group-hover:text-theme-primary transition-colors">
              {item.title}
              <LuArrowRight size={16} aria-hidden className="shrink-0" />
            </span>
            <span className="mt-2 text-sm text-theme-text/70 dark:text-theme-muted leading-relaxed">
              {item.text}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CtaPanel({
  title,
  text,
  primary,
  secondary,
}: {
  title: string;
  text: string;
  primary: CtaLink;
  secondary?: CtaLink;
}) {
  return (
    <section className="mt-10 rounded-2xl border border-theme-card dark:border-theme-border bg-theme-surface dark:bg-theme-surface p-6 sm:p-10 text-center">
      <h2 className="text-2xl sm:text-3xl font-black text-theme-text dark:text-theme-text">
        {title}
      </h2>
      <p className="mt-3 max-w-xl mx-auto text-theme-text/70 dark:text-theme-muted">
        {text}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        <PrimaryButton {...primary} />
        {secondary && <SecondaryButton {...secondary} />}
      </div>
    </section>
  );
}
