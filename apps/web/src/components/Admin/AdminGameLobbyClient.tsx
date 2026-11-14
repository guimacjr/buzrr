"use client";

import GameLobby from "@/components/Admin/Game/GameLobby";
import Skeleton from "@/components/ui/Skeleton";
import { useAdminLobbyQuery } from "@/lib/modules/game-sessions/hooks";
import { isAxiosError } from "axios";
import { notFound } from "next/navigation";

export default function AdminGameLobbyClient({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string;
}) {
  const { data, isPending, isError, error } = useAdminLobbyQuery(roomId);

  if (isError) {
    if (isAxiosError(error)) {
      if (error.response?.status === 404) notFound();
      if (error.response?.status === 403) {
        return (
          <p className="p-6 text-theme-text dark:text-theme-text">
            Unauthorized
          </p>
        );
      }
    }
    return (
      <p className="p-6 text-theme-text dark:text-theme-text">
        Could not load this lobby. Try again later.
      </p>
    );
  }

  if (isPending) {
    return (
      <div className="w-full p-6">
        <Skeleton className="mx-auto h-[85vh] w-full max-w-5xl rounded-2xl bg-theme-surface dark:bg-theme-card" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="p-6 text-theme-text dark:text-theme-text">
        Could not load this lobby. Try again later.
      </p>
    );
  }

  const { room, players, quiz } = data;
  const playersForLobby = players.map((p) => ({
    ...p,
    profilePic: p.profilePic ?? undefined,
  }));

  return (
    <div className="w-full bg-theme-background dark:bg-theme-background">
      <GameLobby
        roomId={roomId}
        userId={userId}
        gameCode={room.gameCode}
        players={playersForLobby}
        quizQuestions={quiz}
      />
    </div>
  );
}
