"use client";

import DownloadReportButton from "../DownloadReportButton";
import { useState } from "react";
import NavbarToggle from "@/components/Admin/NavbarToggle";
import LeaderboardView from "@/components/Admin/LeaderboardView";
import Skeleton from "@/components/ui/Skeleton";
import { useHistoryQuery } from "@/lib/modules/game-sessions/hooks";

function HistoryBody({
  onShowLeaderboard,
}: {
  onShowLeaderboard: (resultId: string) => void;
}) {
  const { data: results, isPending, isError } = useHistoryQuery();

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-20 w-full rounded-xl bg-theme-surface dark:bg-theme-card"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-theme-text dark:text-theme-text">
        Could not load your game history. Try again later.
      </p>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="border border-theme-border border-dashed rounded-lg p-6 text-center text-theme-text dark:text-theme-text">
        <p className="text-lg font-black">No games played yet</p>
        <p className="text-sm mt-2">
          Host a quiz and the final results will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((result) => (
        <div
          key={result.id}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left bg-theme-surface dark:bg-theme-card rounded-xl p-4 hover:bg-theme-card dark:hover:bg-theme-cardHover transition-colors hover:cursor-pointer"
        >
          <div>
            <p className="font-bold text-theme-text dark:text-theme-text capitalize">
              {result.quizTitle}
            </p>
            <p className="text-xs text-theme-muted dark:text-theme-muted mt-1">
              {new Date(result.endedAt).toLocaleString()} · Room{" "}
              {result.gameCode}
            </p>
          </div>
          <div className="flex gap-4 text-sm text-theme-text dark:text-theme-text">
            <span>
              {result.playerCount} player
              {result.playerCount === 1 ? "" : "s"}
            </span>
            <span>
              {result.questionCount} question
              {result.questionCount === 1 ? "" : "s"}
            </span>
            {result.mode === "duel" && (
              <span className="font-bold text-theme-primary dark:text-theme-primary">
                Duel
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="text-sm underline"
              onClick={() => onShowLeaderboard(result.id)}
            >
              See leaderboard
            </button>
            {result.mode === "classic" && (
              <DownloadReportButton resultId={result.id} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HistoryClient() {
  const [leaderboardId, setLeaderboardId] = useState<string | null>(null);

  return (
    <div className="w-full p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="md:hidden">
          <NavbarToggle />
        </span>
        <h1 className="text-2xl font-black text-theme-text dark:text-theme-text">
          Game History
        </h1>
      </div>
      {leaderboardId ? (
        <LeaderboardView
          roomId={leaderboardId}
          onBack={() => setLeaderboardId(null)}
          backLabel="Back to history"
        />
      ) : (
        <HistoryBody onShowLeaderboard={setLeaderboardId} />
      )}
    </div>
  );
}
