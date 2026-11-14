"use client";
import { useAppSelector } from "@/state/hooks";

/**
 * Connection feedback: a slim banner while socket.io retries automatically,
 * and a blocking overlay with a manual retry once it has given up. Game state
 * resyncs automatically (server pushes `state-sync`) when the connection is
 * back.
 */
export default function ConnectionBanner() {
  const connection = useAppSelector((state) => state.game.connection);

  if (connection === "connected" || connection === "connecting") return null;

  if (connection === "reconnecting") {
    return (
      <div
        role="status"
        className="fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-bold text-theme-onPrimary bg-theme-danger dark:bg-theme-danger"
      >
        <span className="inline-block h-3 w-3 mr-2 rounded-full border-2 border-theme-border border-t-transparent animate-spin align-middle" />
        Conexão perdida — reconectando…
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/70 px-6 text-center"
    >
      <p className="text-xl font-black text-theme-onPrimary">Desconectado</p>
      <p className="text-sm text-theme-onPrimary/80 max-w-xs">
        Não foi possível conectar ao servidor da partida. Verifique sua conexão
        com a internet.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl font-bold bg-theme-primary dark:bg-theme-primary text-theme-onPrimary dark:text-theme-onPrimary"
      >
        Toque para tentar novamente
      </button>
    </div>
  );
}
