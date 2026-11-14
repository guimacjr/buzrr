"use client";

import clsx from "clsx";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LuCheck } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import ProPrice from "@/components/Pricing/ProPrice";
import { usePriceRegion } from "@/hooks/usePriceRegion";
import { authClient } from "@/lib/auth-client";
import {
  useEntitlementsQuery,
  useProPricingQuery,
} from "@/lib/modules/billing/hooks";
import { FALLBACK_PRICING, PLAN_COPY, formatMoney } from "@/lib/pricing";

const CHECKOUT_PATH = "/billing/checkout";

const ctaBase =
  "mt-8 flex w-full items-center justify-center rounded-xl px-5 py-3 font-bold transition-opacity";
const ctaPrimary = `${ctaBase} bg-theme-primary dark:bg-theme-primary text-theme-onPrimary dark:text-theme-onPrimary hover:opacity-90`;
const ctaOutline = `${ctaBase} border-2 border-theme-primary dark:border-theme-primary text-theme-primary dark:text-theme-primary hover:opacity-80`;
const ctaDisabled = `${ctaBase} bg-theme-border/30 text-theme-muted dark:text-theme-muted cursor-default`;

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 text-sm text-theme-text dark:text-theme-text"
        >
          <LuCheck
            size={18}
            className="mt-0.5 shrink-0 text-theme-primary dark:text-theme-primary"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Region and session are read in the browser so `/pricing` can be a static
 * page served from the CDN instead of a function render on every visit.
 */
export default function PricingPlans() {
  const { region, resolved } = usePriceRegion(null);
  const pricingQuery = useProPricingQuery(region, resolved);
  const pricing = pricingQuery.data;
  // Until the live price arrives (or if it fails) show the regional default.
  const currency = pricing?.currency ?? FALLBACK_PRICING[region].currency;
  const amount = pricing?.amount ?? FALLBACK_PRICING[region].amount;
  const priceLoading = !resolved || pricingQuery.isPending;

  // Not `authClient.useSession()`: better-auth is a server-external package, so
  // its hook resolves a second React copy when this page is prerendered.
  const { data: session, isPending: sessionPending } = useQuery({
    queryKey: ["auth", "session"] as const,
    // getSession() resolves with { error } instead of throwing; rethrow so a
    // failed lookup is retried rather than read as "signed out".
    queryFn: async () => {
      const { data, error } = await authClient.getSession();
      if (error) throw error;
      return data ?? null;
    },
  });
  const signedIn = Boolean(session?.user);

  const { data: entitlements, isPending: entitlementsPending } =
    useEntitlementsQuery({ enabled: signedIn });
  const plan = entitlements?.plan;
  const billingOff = entitlements ? !entitlements.billingEnabled : false;

  const proCta = (() => {
    if (sessionPending) {
      return <span className={ctaDisabled}>Loading…</span>;
    }
    if (!signedIn) {
      return (
        <Link
          href={`/auth/login?callbackURL=${encodeURIComponent(CHECKOUT_PATH)}`}
          className={ctaPrimary}
        >
          Get Buzrr Pro
        </Link>
      );
    }
    // Until the plan loads, don't offer an upgrade a Pro user doesn't need.
    if (entitlementsPending) {
      return <span className={ctaDisabled}>Loading…</span>;
    }
    if (billingOff) {
      return (
        <span className={ctaDisabled}>Not available on this instance</span>
      );
    }
    if (plan === "pro") {
      return (
        <Link href="/admin/billing" className={ctaOutline}>
          Manage your plan
        </Link>
      );
    }
    return (
      <Link href={CHECKOUT_PATH} className={ctaPrimary}>
        Upgrade to Pro
      </Link>
    );
  })();

  return (
    <div className="mt-12 grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl bg-theme-surface dark:bg-theme-card p-6 md:p-8 border border-theme-card dark:border-theme-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-theme-text dark:text-theme-text">
            Free
          </h2>
          {signedIn && plan === "free" && <Badge>Your plan</Badge>}
        </div>
        <p className="mt-1 text-sm text-theme-muted dark:text-theme-muted">
          Everything you need to run your first games.
        </p>
        <p className="mt-6 text-theme-text dark:text-theme-text">
          <span className="text-4xl font-black">
            {resolved ? formatMoney(0, currency) : " "}
          </span>
          <span className="text-sm text-theme-muted dark:text-theme-muted">
            {" "}
            / forever
          </span>
        </p>
        <FeatureList
          items={[
            `Up to ${PLAN_COPY.free.maxPlayers} players per room`,
            `Up to ${PLAN_COPY.free.maxQuizzes} quizzes`,
            `${PLAN_COPY.free.aiTokens} AI quiz generations (one-time)`,
            "Ranked 1v1 duels and friend challenges",
            "Join by code, link or QR",
          ]}
        />
        <Link href={signedIn ? "/admin" : "/auth/login"} className={ctaOutline}>
          {signedIn ? "Go to your quizzes" : "Start for free"}
        </Link>
      </section>

      <section
        className={clsx(
          "relative rounded-2xl bg-theme-surface dark:bg-theme-card p-6 md:p-8 border-2",
          "border-theme-primary dark:border-theme-primary shadow-lg",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-theme-text dark:text-theme-text">
            Buzrr Pro
          </h2>
          {signedIn && plan === "pro" ? (
            <Badge tone="success">Your plan</Badge>
          ) : (
            <Badge tone="info">For hosts & classrooms</Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-theme-muted dark:text-theme-muted">
          Bigger rooms, no quiz cap, weekly AI.
        </p>
        <div className="mt-6">
          <ProPrice
            currency={currency}
            amount={amount}
            discount={pricing?.discount ?? null}
            loading={priceLoading}
          />
        </div>
        <FeatureList
          items={[
            `Up to ${PLAN_COPY.pro.maxPlayers} players per room`,
            "Unlimited quizzes",
            `${PLAN_COPY.pro.aiTokensPerWeek} AI quiz generations every week`,
            "Everything in Free",
            "Cancel anytime — keep Pro until your period ends",
          ]}
        />
        {proCta}
      </section>
    </div>
  );
}
