import Link from "next/link";
import { CONTACT_EMAIL } from "@/components/Landing/links";
import {
  Breadcrumbs,
  JsonLd,
  PageContainer,
  breadcrumbSchema,
} from "@/components/Marketing/primitives";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/data/legal";
import { webPageSchema } from "@/lib/seo/json-ld";

/**
 * Shared shell for the legal pages (privacy, terms, refunds). Server-only;
 * styling follows the marketing pages.
 */

export function LegalDocument({
  path,
  title,
  description,
  children,
}: {
  path: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const crumbs = [
    { name: "Home", path: "/" },
    { name: title, path },
  ];
  return (
    <PageContainer>
      <JsonLd
        nodes={[
          webPageSchema({ path, title, description }),
          breadcrumbSchema(crumbs),
        ]}
      />
      <header className="pt-8 pb-8 sm:pt-10">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="mt-8 text-3xl sm:text-5xl font-black text-theme-text dark:text-theme-text leading-tight">
          {title}
        </h1>
        <p className="mt-3 text-sm font-semibold text-theme-text/60 dark:text-theme-muted">
          Last updated: {LEGAL_UPDATED}
        </p>
        <p className="mt-5 text-base sm:text-lg text-theme-text/70 dark:text-theme-muted max-w-3xl">
          {description}
        </p>
      </header>

      <div className="space-y-2">{children}</div>

      <nav
        aria-label="Legal"
        className="mt-10 pt-6 border-t border-theme-card dark:border-theme-card flex flex-wrap gap-x-6 gap-y-2 text-sm"
      >
        {LEGAL_PAGES.filter((page) => page.path !== path).map((page) => (
          <Link
            key={page.path}
            href={page.path}
            className="text-theme-primary dark:text-theme-primary underline underline-offset-2"
          >
            {page.name}
          </Link>
        ))}
      </nav>
    </PageContainer>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-8 border-t border-theme-card dark:border-theme-card">
      <h2 className="text-xl sm:text-2xl font-black text-theme-text dark:text-theme-text">
        {title}
      </h2>
      <div className="mt-4 space-y-4 max-w-3xl text-theme-text/80 dark:text-theme-muted leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_a]:text-theme-primary dark:[&_a]:text-theme-primary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-theme-text dark:[&_strong]:text-theme-onPrimary">
        {children}
      </div>
    </section>
  );
}

export function ContactEmail() {
  return <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
}
