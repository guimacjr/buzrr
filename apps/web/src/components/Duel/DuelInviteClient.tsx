"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import ClientImage from "@/components/ClientImage";
import DuelInviteGuestView from "@/components/Duel/DuelInviteGuestView";
import DuelInviteHostView from "@/components/Duel/DuelInviteHostView";
import { useDuelInviteQuery } from "@/lib/modules/duel/hooks";
import type { DuelMatchedPayload } from "@buzrr/contract";
import { storeMatched } from "./matchedStorage";

/**
 * Landing page for a 1v1 friend challenge. One URL serves both sides: the host
 * gets the share widget, the invited friend gets an Accept button.
 */
export default function DuelInviteClient({ code }: { code: string }) {
  const router = useRouter();
  const { data: invite, isPending, isError } = useDuelInviteQuery(code);

  const onMatched = useCallback(
    (payload: DuelMatchedPayload) => {
      storeMatched(payload);
      router.push(`/duel/game/${payload.gameCode}`);
    },
    [router],
  );

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="sticky top-0 z-40 bg-theme-background/90 dark:bg-theme-background/90 backdrop-blur border-b border-theme-card dark:border-theme-card">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3">
          <Link href="/" aria-label="Buzrr home">
            <ClientImage
              props={{
                src: "/images/logo.svg",
                darksrc: "/images/logo-dark.svg",
                alt: "Buzrr Logo",
                width: 72,
                height: 72,
              }}
            />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {isPending ? (
          <Skeleton className="h-64 w-full max-w-sm rounded-2xl bg-theme-surface dark:bg-theme-card" />
        ) : isError || !invite ? (
          <InviteGone reason="This challenge link has expired or was cancelled." />
        ) : invite.status === "claimed" ? (
          // Before isHost: a host reloading after their friend accepted has
          // already missed the duel:matched push, and would otherwise sit on
          // "waiting" while their duel ran without them.
          invite.isHost || invite.isClaimer ? (
            <RejoiningDuel code={invite.code} />
          ) : (
            <InviteGone reason="Someone else already accepted this challenge." />
          )
        ) : invite.isHost ? (
          <DuelInviteHostView invite={invite} onMatched={onMatched} />
        ) : (
          <DuelInviteGuestView invite={invite} onMatched={onMatched} />
        )}
      </div>
    </div>
  );
}

/** The invite is now a live duel and this viewer is in it — send them in. */
function RejoiningDuel({ code }: { code: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/duel/game/${code}`);
  }, [code, router]);

  return (
    <p className="font-bold text-theme-text dark:text-theme-text animate-pulse">
      Rejoining your duel…
    </p>
  );
}

function InviteGone({ reason }: { reason: string }) {
  return (
    <div className="flex flex-col items-center gap-4 bg-theme-surface dark:bg-theme-surface rounded-2xl p-6 w-full max-w-sm shadow border border-theme-card dark:border-theme-border animate-fade-up">
      <p className="text-2xl font-black text-theme-text dark:text-theme-text text-center">
        Challenge unavailable
      </p>
      <p className="text-sm text-theme-muted dark:text-theme-muted text-center">
        {reason}
      </p>
      <Link href="/duel" className="w-full">
        <Button fullWidth>Start a duel</Button>
      </Link>
    </div>
  );
}
