"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ConfirmationModal from "@/components/Admin/ConfirmationModal";
import { Button } from "@/components/ui/Button";
import { useEndRoomMutation } from "@/lib/modules/game-sessions/hooks";
import { primaryButtonClass } from "@/components/Game/GameUI";

/**
 * Host control shown on every gameplay screen (lobby, question, reveal,
 * leaderboard). Ending a started game saves the current standings as the game
 * result before tearing the room down — the modal stays open with a loader
 * until that write finishes. The final leaderboard ("final" phase) is not yet
 * saved either — its primary "Back to quizzes" button ends and saves without a
 * confirmation, since the quiz is already complete. Only once the room has
 * ended (`alreadyEnded`) is the button a plain exit.
 */
export default function EndQuizButton({
  roomId,
  redirectTo = "/admin/history",
  alreadyEnded = false,
  inline = false,
  primaryLabel,
}: {
  roomId: string;
  redirectTo?: string;
  /** True on the final leaderboard: the game already ended, so just exit. */
  alreadyEnded?: boolean;
  inline?: boolean;
  /** Render as the gameplay primary button with this label instead. */
  primaryLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const endRoomMutation = useEndRoomMutation();

  async function confirmEnd() {
    setEnding(true);
    try {
      // Resolves only after the server has persisted the GameResult.
      await endRoomMutation.mutateAsync(roomId);
      router.push(redirectTo);
    } catch (err) {
      // 404: the room was already ended (another tab, the abandon sweep) —
      // its result is saved, so there is nothing left to do but leave.
      if (isAxiosError(err) && err.response?.status === 404) {
        router.push(redirectTo);
        return;
      }
      toast.error("Não foi possível encerrar o quiz. Tente novamente.");
      setEnding(false);
    }
  }

  return (
    <>
      {primaryLabel ? (
        <button
          type="button"
          className={primaryButtonClass}
          disabled={ending}
          onClick={() =>
            alreadyEnded ? router.push(redirectTo) : void confirmEnd()
          }
        >
          {ending ? "Salvando resultados…" : primaryLabel}
        </button>
      ) : inline ? (
        <button
          type="button"
          className="shrink-0 whitespace-nowrap rounded-xl border-[1.5px] border-theme-danger dark:border-theme-danger px-4 md:px-[18px] py-2 md:py-[9px] text-sm md:text-[14.5px] font-semibold text-theme-danger dark:text-theme-danger transition-colors hover:bg-theme-danger dark:hover:bg-theme-danger hover:text-theme-onPrimary dark:hover:text-theme-text cursor-pointer"
          onClick={() =>
            alreadyEnded ? router.push(redirectTo) : setOpen(true)
          }
        >
          {alreadyEnded ? "Sair" : "Encerrar quiz"}
        </button>
      ) : (
        <Button
          size="sm"
          className="fixed top-3 right-4 md:right-8 z-50 bg-theme-danger dark:bg-theme-danger text-theme-onPrimary dark:text-theme-onPrimary hover:bg-theme-danger"
          onClick={() =>
            alreadyEnded ? router.push(redirectTo) : setOpen(true)
          }
        >
          {alreadyEnded ? "Sair" : "Encerrar quiz"}
        </Button>
      )}
      <ConfirmationModal
        open={open}
        setOpen={setOpen}
        onClick={confirmEnd}
        confirming={ending}
        confirmLabel="Encerrar quiz"
        confirmingLabel="Salvando resultados…"
        desc="Isso encerra o quiz para todos e salva os resultados atuais. Essa ação não pode ser desfeita."
      />
    </>
  );
}
