"use client";
import clsx from "clsx";
import { DEFAULT_AVATAR } from "@/constants";
import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { removePlayer, setPlayers } from "@/state/admin/playersSlice";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  LuBan,
  LuCheck,
  LuCopy,
  LuPlay,
  LuSearch,
  LuShare2,
  LuX,
} from "react-icons/lu";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ConnectionStatusPill from "@/components/ConnectionStatusPill";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import {
  useBanRoomPlayerMutation,
  useRemoveRoomPlayerMutation,
} from "@/lib/modules/game-sessions/hooks";
import type { PlayerPayload } from "@buzrr/contract";
import ConfirmationModal from "@/components/Admin/ConfirmationModal";
import { buildJoinUrl } from "@/lib/join-link";
import EndQuizButton from "@/components/Admin/EndQuizButton";

const Lobby = (params: {
  roomId: string;
  userId: string;
  gameCode: string;
  players: PlayerPayload[];
  gameStarted: boolean;
  quizTitle: string;
  quizId: string;
  maxPlayers?: number;
  plan?: "free" | "pro";
}) => {
  const dispatch = useAppDispatch();
  const players = useAppSelector((state) => state.player.players);
  const maxPlayers = params.maxPlayers ?? 50;
  const [load, setLoad] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (params?.gameStarted) {
      router.push(`/admin/game/${params.roomId}`);
    }

    dispatch(setPlayers(params.players));
  }, [dispatch, params.players, params.gameStarted, params.roomId, router]);

  const handleGameStarted = useCallback(() => {
    setLoad(false);
    router.push(`/admin/game/${params.roomId}`);
  }, [params.roomId, router]);

  const { socket } = useAdminSocket({
    gameCode: params.gameCode,
    onPlayerRemoved: (player) => {
      toast.error(
        player.banned
          ? `Você bloqueou ${player.name ?? "o participante"}`
          : `Você removeu ${player.name ?? "o participante"}`,
      );
    },
    onGameStarted: handleGameStarted,
  });

  const removePlayerMutation = useRemoveRoomPlayerMutation();
  const banPlayerMutation = useBanRoomPlayerMutation();
  const [playerToBan, setPlayerToBan] = useState<PlayerPayload | null>(null);

  // Kick, ban and stop-hosting go over HTTP so they work even while the socket
  // is down; the server broadcasts the resulting events to everyone connected.
  function handlePlayerRemove(player: PlayerPayload) {
    removePlayerMutation.mutate(
      { roomId: params.roomId, playerId: player.id },
      {
        onSuccess: () => {
          // Connected clients get the player-removed broadcast; update
          // locally in case ours is down (the reducer is idempotent).
          dispatch(removePlayer({ id: player.id }));
          if (!socket?.connected) {
            toast.error(`Você removeu ${player.name ?? "o participante"}`);
          }
        },
        onError: () => {
          toast.error(
            "Não foi possível remover o participante. Tente novamente.",
          );
        },
      },
    );
  }

  function handlePlayerBan() {
    const player = playerToBan;
    if (!player) return;
    banPlayerMutation.mutate(
      { roomId: params.roomId, playerId: player.id },
      {
        onSuccess: () => {
          dispatch(removePlayer({ id: player.id }));
          setPlayerToBan(null);
          if (!socket?.connected) {
            toast.error(`Você bloqueou ${player.name ?? "o participante"}`);
          }
        },
        onError: () => {
          toast.error(
            "Não foi possível bloquear o participante. Tente novamente.",
          );
        },
      },
    );
  }

  function handleGameStart() {
    if (!socket?.connected) {
      toast.error("Ainda não há conexão com o servidor da partida. Aguarde.");
      return;
    }
    setLoad(true);
    socket.emit("start-game", params.gameCode);
    // Move to the game screen right away instead of waiting for the
    // `game-started` round-trip — it syncs the countdown over the socket on
    // connect, so the host isn't stranded on the lobby while the server spins
    // up the game. `onGameStarted` remains a backup navigation.
    router.push(`/admin/game/${params.roomId}`);
  }

  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [canShare, setCanShare] = useState(false);
  const joinUrl = buildJoinUrl(params.gameCode);
  const isFull = players.length >= maxPlayers;
  const fillPct = Math.min(100, (players.length / maxPlayers) * 100);
  const visiblePlayers = players.filter((p) =>
    (p.name ?? "").toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  function copy(what: "code" | "link", text: string) {
    (
      navigator.clipboard?.writeText(text) ??
      Promise.reject(new Error("Área de transferência indisponível"))
    )
      .then(() => setCopied(what))
      .catch(() => toast.error("Não foi possível copiar"));
  }

  const startDisabled = players.length === 0 || load || !socket?.connected;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col px-4 sm:px-6 lg:px-8 pb-4 md:pb-0 md:h-[calc(100dvh-10rem)] text-theme-text dark:text-theme-text">
      <div className="flex flex-wrap md:flex-nowrap items-center gap-2.5 md:gap-[18px] py-3.5 md:py-[18px] shrink-0">
        <ConnectionStatusPill className="!shadow-none !text-[13px] !font-semibold !px-3 !py-1.5 !border-theme-primary/15 dark:!border-theme-border/10 !bg-theme-surface dark:!bg-theme-surface/5" />
        <div className="order-last md:order-none basis-full md:basis-auto flex-1 min-w-0 flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-3">
          <h1 className="text-[22px] md:text-2xl font-bold tracking-[-0.01em] truncate">
            {params?.quizTitle}
          </h1>
          <span className="text-sm text-theme-muted dark:text-theme-muted whitespace-nowrap">
            Aguardando participantes
          </span>
        </div>
        <span className="flex-1 md:hidden" />
        <EndQuizButton
          inline
          roomId={params.roomId}
          redirectTo={`/admin/quiz/${params.quizId}`}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3.5 md:gap-5 pb-0 md:pb-[18px]">
        <section className="rounded-3xl border bg-theme-surface dark:bg-theme-surface border-theme-primary/15 dark:border-theme-border/5 flex flex-col gap-4 md:gap-3.5 [@media(min-height:900px)]:md:gap-5 p-[18px] md:p-[22px] [@media(min-height:900px)]:md:p-[26px] md:min-h-0 md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-xs font-semibold tracking-[0.12em] uppercase text-theme-muted dark:text-theme-muted">
            Código da sala
          </span>
          <button
            type="button"
            onClick={() => copy("code", params.gameCode)}
            className="group w-full flex flex-col items-center gap-1.5 rounded-[18px] border-[1.5px] border-dashed hover:border-solid border-theme-primary bg-theme-primary/5 dark:bg-theme-primary/12 px-3 pt-5 pb-4 md:pt-4 md:pb-3 [@media(min-height:900px)]:md:pt-5 [@media(min-height:900px)]:md:pb-4 cursor-pointer transition-transform active:scale-[0.99]"
          >
            <b className="text-[38px] md:text-[40px] [@media(min-height:900px)]:md:text-[46px] font-extrabold tracking-[0.14em] pl-[0.14em] leading-[1.1] tabular-nums text-theme-primary dark:text-theme-primary">
              {params?.gameCode}
            </b>
            <small
              className={clsx(
                "flex items-center gap-1.5 text-[13px]",
                copied === "code"
                  ? "text-theme-success"
                  : "text-theme-muted dark:text-theme-muted",
              )}
            >
              {copied === "code" ? (
                <>
                  <LuCheck size={16} />
                  Código copiado
                </>
              ) : (
                <>
                  <LuCopy size={16} />
                  Clique para copiar
                </>
              )}
            </small>
          </button>

          <div className="flex items-center gap-[18px]">
            <div className="size-[140px] md:size-[150px] [@media(min-height:900px)]:md:size-[200px] shrink-0 rounded-[14px] bg-theme-surface p-2 md:p-2.5 border border-theme-primary/15 dark:border-theme-border/5">
              <QRCodeSVG
                value={joinUrl}
                marginSize={0}
                level="M"
                className="size-full"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="text-xs font-semibold tracking-[0.12em] uppercase text-theme-muted dark:text-theme-muted">
                Leia o QR code para entrar
              </span>
              <p className="text-[13.5px] leading-normal text-theme-muted dark:text-theme-muted">
                Os participantes podem ler o QR code com a câmera do celular ou
                abrir o link abaixo.
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-theme-primary/8 dark:bg-theme-surface/5 border-theme-primary/15 dark:border-theme-border/5 px-3.5 py-2.5">
            <p className="truncate text-[13.5px] text-theme-muted dark:text-theme-muted">
              {joinUrl}
            </p>
          </div>
          <div
            className={clsx(
              "grid gap-2.5",
              canShare ? "grid-cols-2" : "grid-cols-1",
            )}
          >
            <button
              type="button"
              onClick={() => copy("link", joinUrl)}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-xl border-[1.5px] bg-theme-background dark:bg-theme-card p-[11px] text-sm font-semibold cursor-pointer transition-colors",
                copied === "link"
                  ? "border-theme-success text-theme-success"
                  : "border-theme-primary/15 dark:border-theme-border/5 hover:border-theme-primary",
              )}
            >
              {copied === "link" ? <LuCheck size={16} /> : <LuCopy size={16} />}
              {copied === "link" ? "Copiado" : "Copiar link"}
            </button>
            {canShare && (
              <button
                type="button"
                onClick={() => {
                  navigator.share({ url: joinUrl }).catch(() => {});
                }}
                className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] bg-theme-background dark:bg-theme-card border-theme-primary/15 dark:border-theme-border/5 hover:border-theme-primary p-[11px] text-sm font-semibold cursor-pointer transition-colors"
              >
                <LuShare2 size={16} />
                Compartilhar
              </button>
            )}
          </div>

          <div className="md:mt-auto pt-[18px] md:pt-3.5 [@media(min-height:900px)]:md:pt-[18px] border-t border-theme-primary/15 dark:border-theme-border/10 flex flex-col gap-[9px]">
            <div className="flex justify-between items-baseline text-[13.5px] text-theme-muted dark:text-theme-muted">
              <span>Participantes</span>
              <span>
                <b
                  className={clsx(
                    "text-xl font-bold",
                    isFull
                      ? "text-theme-danger dark:text-theme-danger"
                      : "text-theme-text dark:text-theme-text",
                  )}
                >
                  {players.length}
                </b>{" "}
                / {maxPlayers}
              </span>
            </div>
            <div className="h-2 rounded-lg overflow-hidden bg-theme-primary/8 dark:bg-theme-surface/5">
              <div
                className={clsx(
                  "h-full rounded-lg transition-[width] duration-300",
                  isFull
                    ? "bg-theme-danger dark:bg-theme-danger"
                    : "bg-linear-to-br from-theme-accent to-theme-accentDeep dark:from-theme-accent dark:to-theme-accentDeep",
                )}
                style={{ width: `${fillPct}%` }}
              />
            </div>
            <p className="text-[12.5px] text-theme-muted dark:text-theme-muted">
              Esta sala comporta até {maxPlayers} participantes.
              {params.plan === "free" && (
                <>
                  {" "}
                  <Link
                    href="/pricing"
                    className="font-semibold text-theme-primary dark:text-theme-primary hover:underline"
                  >
                    Mude para o Pro
                  </Link>{" "}
                  para salas com até 250 participantes.
                </>
              )}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border bg-theme-surface dark:bg-theme-surface border-theme-primary/15 dark:border-theme-border/5 flex flex-col md:min-h-0 md:overflow-hidden">
          <div className="flex flex-wrap items-center gap-3.5 p-4 md:px-[22px] md:pt-5 md:pb-4 border-b border-theme-primary/15 dark:border-theme-border/10">
            <h2 className="flex items-center gap-[7px] text-sm font-semibold">
              Participantes
              <span className="rounded-full px-2 py-px text-xs bg-theme-primary/8 dark:bg-theme-surface/5 text-theme-muted dark:text-theme-muted">
                {players.length}
              </span>
            </h2>
            <label className="flex-1 min-w-40 flex items-center gap-2 rounded-xl border bg-theme-background dark:bg-theme-card border-theme-primary/15 dark:border-theme-border/5 focus-within:border-theme-primary px-3 text-theme-muted dark:text-theme-muted">
              <LuSearch size={17} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar participantes"
                aria-label="Buscar participantes"
                className="flex-1 min-w-0 bg-transparent outline-none py-2.5 text-sm text-theme-text dark:text-theme-text"
              />
            </label>
          </div>

          <div className="md:flex-1 md:min-h-0 md:overflow-y-auto px-4 py-3 md:px-[22px] md:py-4 grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2.5 content-start">
            {visiblePlayers.map((player) => (
              <div
                key={player.id}
                className="group flex items-center gap-[11px] min-w-0 rounded-[14px] border bg-theme-background dark:bg-theme-card border-theme-primary/15 dark:border-theme-border/5 hover:border-theme-primary py-2 pr-2 pl-[9px] transition-colors animate-pop-in"
              >
                <Image
                  unoptimized
                  src={player.profilePic || DEFAULT_AVATAR}
                  width={36}
                  height={36}
                  alt=""
                  className="size-9 shrink-0 rounded-full object-cover"
                />
                <span
                  className="flex-1 min-w-0 truncate text-[14.5px] font-medium"
                  title={player.name ?? undefined}
                >
                  {player.name}
                </span>
                <span className="flex gap-0.5 shrink-0 md:opacity-55 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    aria-label={`Bloquear ${player.name} desta sala`}
                    title="Bloquear (não poderá voltar)"
                    onClick={() => setPlayerToBan(player)}
                    className="size-[30px] rounded-[9px] flex items-center justify-center text-theme-muted dark:text-theme-muted hover:bg-theme-danger/14 hover:text-theme-danger transition-colors cursor-pointer"
                  >
                    <LuBan size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${player.name}`}
                    title="Remover (poderá voltar)"
                    onClick={() => handlePlayerRemove(player)}
                    className="size-[30px] rounded-[9px] flex items-center justify-center text-theme-muted dark:text-theme-muted hover:bg-theme-danger/14 hover:text-theme-danger transition-colors cursor-pointer"
                  >
                    <LuX size={17} />
                  </button>
                </span>
              </div>
            ))}
            {visiblePlayers.length === 0 && (
              <div className="col-span-full text-center text-sm py-10 text-theme-muted dark:text-theme-muted">
                {query.trim()
                  ? "Nenhum participante encontrado."
                  : "Aguardando a entrada dos participantes…"}
              </div>
            )}
          </div>

          <div className="sticky bottom-12 md:static flex flex-col md:flex-row items-stretch md:items-center gap-2.5 md:gap-4 px-4 py-3.5 md:px-[22px] md:py-4 border-t border-theme-primary/15 dark:border-theme-border/10 bg-theme-surface dark:bg-theme-surface rounded-b-3xl">
            <p className="flex-1 text-[13.5px] text-theme-muted dark:text-theme-muted">
              {players.length}{" "}
              {players.length === 1
                ? "participante pronto"
                : "participantes prontos"}
              . Mais pessoas podem entrar até você iniciar.
            </p>
            <button
              type="button"
              disabled={startDisabled}
              onClick={handleGameStart}
              className="flex items-center justify-center gap-2.5 whitespace-nowrap rounded-[14px] px-[30px] py-3.5 text-base font-bold text-theme-onAccent bg-linear-to-br from-theme-accent to-theme-accentDeep dark:from-theme-accent dark:to-theme-accentDeep shadow-[0_10px_24px_-10px_var(--color-theme-accentDeep)] transition-[filter,transform] hover:brightness-108 active:translate-y-px cursor-pointer disabled:opacity-50 disabled:cursor-default disabled:hover:brightness-100"
            >
              <LuPlay size={17} className="fill-current" />
              {load ? "Carregando…" : "Iniciar partida"}
            </button>
          </div>
        </section>
      </div>

      <ConfirmationModal
        open={playerToBan !== null}
        setOpen={(open) => {
          if (!open) setPlayerToBan(null);
        }}
        onClick={handlePlayerBan}
        desc={`${playerToBan?.name ?? "Este participante"} será removido e impedido de voltar a esta sala. O bloqueio dura até o encerramento da sala.`}
        confirmLabel="Bloquear participante"
        confirming={banPlayerMutation.isPending}
        confirmingLabel="Bloqueando…"
      />
    </div>
  );
};

export default Lobby;
