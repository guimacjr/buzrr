"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { LuBan, LuPlay, LuX } from "react-icons/lu";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { DEFAULT_AVATAR } from "@/constants";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import ConfirmationModal from "@/components/Admin/ConfirmationModal";
import { playerRemoved } from "@/state/game/gameSlice";
import {
  useBanRoomPlayerMutation,
  useRemoveRoomPlayerMutation,
} from "@/lib/modules/game-sessions/hooks";
import {
  RevealBreakdown,
  revealStats,
  QuestionTypePill,
  isScoredType,
} from "@/components/QuestionTypes";
import {
  StatTile,
  labelClass,
  mutedText,
  panelClass,
  primaryButtonClass,
} from "@/components/Game/GameUI";
import { AnimatedNumber, useFlipReorder } from "@/components/Game/motion";
import { denseRanks, type LeaderboardEntry } from "@buzrr/contract";
import type { GameSocket } from "@/types/socket";

/** Hold the old standings until the answer bars have mostly filled. */
const SETTLE_DELAY_MS = 1100;

/**
 * The standings as they were before this question: each score minus its
 * `delta`, re-ranked the way the server ranks (ties share a rank). The
 * server only sends the new ones.
 */
function previousStandings(entries: LeaderboardEntry[]) {
  const sorted = entries
    .map((entry, i) => ({ entry, i, prev: entry.score - (entry.delta ?? 0) }))
    .sort((a, b) => b.prev - a.prev || a.i - b.i);
  const ranks = denseRanks(sorted.map((s) => s.prev));
  return sorted.map(({ entry, prev }, i) => ({
    ...entry,
    shownScore: prev,
    shownRank: ranks[i]!,
  }));
}

interface QuesResultProps {
  socket: GameSocket;
  roomId: string;
}

export const rankBadgeClass = (rank: number) =>
  rank === 1
    ? "bg-theme-gold text-theme-onMedal"
    : rank === 2
      ? "bg-theme-silver text-theme-onMedal"
      : rank === 3
        ? "bg-theme-bronze text-theme-onMedal"
        : "bg-theme-primary/8 dark:bg-theme-surface/5 text-theme-muted dark:text-theme-muted";

/**
 * Per-question results. All data (answer counts, running leaderboard,
 * whether this was the last question) is pushed by the server; "Next" is a
 * single pacing intent — the server decides what follows.
 *
 * The leaderboard doubles as the host's moderation surface: every row can be
 * kicked (removed from this round, free to rejoin with the room code) or
 * banned (removed and blocked from rejoining this room).
 */
export default function QuesResult(props: QuesResultProps) {
  const { socket, roomId } = props;
  const dispatch = useAppDispatch();
  const question = useAppSelector((state) => state.game.question);
  const reveal = useAppSelector((state) => state.game.reveal);
  const leaderboard = useAppSelector((state) => state.game.leaderboard);
  const players = useAppSelector((state) => state.game.players);
  const qIndex = useAppSelector((state) => state.game.qIndex);
  const qCount = useAppSelector((state) => state.game.qCount);
  const [advancing, setAdvancing] = useState(false);
  const [playerToBan, setPlayerToBan] = useState<{
    playerId: string;
    name: string;
  } | null>(null);

  const removePlayerMutation = useRemoveRoomPlayerMutation();
  const banPlayerMutation = useBanRoomPlayerMutation();

  const { responses, correct: correctResponses } =
    question && reveal
      ? revealStats(question, reveal.summary)
      : { responses: 0, correct: 0 };
  const correctPct =
    responses > 0 ? Math.round((correctResponses / responses) * 100) : 0;
  const avgTime =
    reveal?.avgTimeMs != null
      ? `${(reveal.avgTimeMs / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s`
      : "—";
  const isLastQuestion = qIndex === qCount - 1;
  const scored = question ? isScoredType(question.type) : true;

  // Start on the pre-question standings, then count scores up and let rows
  // glide into their new ranks.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), SETTLE_DELAY_MS);
    return () => clearTimeout(t);
  }, []);
  const rows = useMemo(
    () =>
      settled
        ? leaderboard.map((e) => ({
            ...e,
            shownScore: e.score,
            shownRank: e.rank,
          }))
        : previousStandings(leaderboard),
    [leaderboard, settled],
  );
  const listRef = useRef<HTMLDivElement>(null);
  useFlipReorder(listRef, rows.map((r) => r.playerId).join());
  const connectedById = new Map(players.map((p) => [p.id, p.connected]));

  // Kick and ban go over HTTP so they work even while the host socket is down;
  // the server broadcasts player-removed and a fresh leaderboard to the room.
  function handleKick(playerId: string, name: string) {
    removePlayerMutation.mutate(
      { roomId, playerId },
      {
        onSuccess: () => {
          dispatch(playerRemoved({ playerId }));
          toast.success(`Você removeu ${name}`);
        },
        onError: () =>
          toast.error(
            "Não foi possível remover o participante. Tente novamente.",
          ),
      },
    );
  }

  function handleBan() {
    if (!playerToBan) return;
    const { playerId, name } = playerToBan;
    banPlayerMutation.mutate(
      { roomId, playerId },
      {
        onSuccess: () => {
          dispatch(playerRemoved({ playerId }));
          setPlayerToBan(null);
          toast.success(`Você bloqueou ${name}`);
        },
        onError: () =>
          toast.error(
            "Não foi possível bloquear o participante. Tente novamente.",
          ),
      },
    );
  }

  if (question?.showRanking === false)
    return (
      <section
        data-host-poll-panel={question?.type === "poll" ? "" : undefined}
        className={clsx(
          panelClass,
          "flex flex-1 flex-col gap-5 p-5 md:p-8 overflow-y-auto",
        )}
      >
        <span className={labelClass}>Pergunta {qIndex + 1} — resultado</span>
        <h2 className="text-xl font-bold">{question.title}</h2>
        <p className={mutedText}>
          {responses} / {players.length} respostas
        </p>
        {reveal && (
          <RevealBreakdown question={question} summary={reveal.summary} />
        )}
        <button
          type="button"
          disabled={advancing}
          data-host-next
          aria-keyshortcuts="ArrowRight"
          title="Avançar (→)"
          onClick={() => {
            setAdvancing(true);
            socket.emit("host-next");
          }}
          className={clsx(primaryButtonClass, "w-full")}
        >
          {isLastQuestion
            ? "Classificação final"
            : `Próxima pergunta · ${qIndex + 2} de ${qCount}`}
          <LuPlay size={17} className="fill-current" />
        </button>
      </section>
    );

  return (
    <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-2 gap-3.5 md:gap-5 md:pb-[18px]">
      <section
        data-host-poll-panel={question?.type === "poll" ? "" : undefined}
        className={clsx(
          panelClass,
          "flex flex-col gap-5 md:gap-[22px] p-5 md:px-[30px] md:py-7 md:min-h-0 md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={labelClass}>
              Pergunta {qIndex + 1} — resultado
            </span>
            {question && !scored && <QuestionTypePill type={question.type} />}
          </div>
          <h2 className="mt-2 text-lg md:text-[22px] font-bold leading-[1.3] tracking-[-0.01em] text-pretty wrap-break-word">
            {question?.title}
          </h2>
        </div>
        <div
          className={clsx(
            "grid gap-2 md:gap-3",
            scored ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          <StatTile
            value={responses}
            suffix={` /${players.length}`}
            label="Respostas"
          />
          {scored && <StatTile value={`${correctPct}%`} label="Acertaram" />}
          <StatTile value={avgTime} label="Tempo médio de resposta" />
        </div>
        {question && reveal && (
          <RevealBreakdown question={question} summary={reveal.summary} />
        )}
      </section>

      <section
        className={clsx(
          panelClass,
          "flex flex-col md:min-h-0 md:overflow-hidden",
        )}
      >
        <div className="flex items-center justify-between px-5 md:px-[26px] pt-5 md:pt-6 pb-3.5">
          <h3 className="text-xl md:text-[22px] font-bold">Classificação</h3>
          <span className={clsx("text-[13.5px]", mutedText)}>
            {leaderboard.length} participante
            {leaderboard.length === 1 ? "" : "s"}
          </span>
        </div>
        <div
          ref={listRef}
          className="md:flex-1 md:min-h-0 md:overflow-y-auto px-3 md:px-[18px] pb-2.5 flex flex-col gap-1.5"
        >
          {rows.map((lead) => {
            const connected = connectedById.get(lead.playerId);
            return (
              <div
                key={lead.playerId}
                data-flip-id={lead.playerId}
                className="group relative bg-theme-surface dark:bg-theme-surface flex items-center gap-3 md:gap-[13px] rounded-[14px] border border-transparent px-2.5 py-[9px] transition-colors hover:bg-theme-background dark:hover:bg-theme-card hover:border-theme-primary/15 dark:hover:border-theme-border/5"
              >
                <span
                  className={clsx(
                    "size-[30px] shrink-0 rounded-[9px] flex items-center justify-center text-sm font-bold transition-colors duration-500",
                    rankBadgeClass(lead.shownRank),
                  )}
                >
                  {lead.shownRank}
                </span>
                <span className="relative shrink-0">
                  <Image
                    unoptimized
                    src={lead.profilePic || DEFAULT_AVATAR}
                    className="size-9 rounded-full object-cover"
                    width={36}
                    height={36}
                    alt=""
                  />
                  <span
                    title={connected ? "Conectado" : "Desconectado"}
                    className={clsx(
                      "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-theme-border dark:border-theme-border",
                      connected ? "bg-theme-success" : "bg-theme-border",
                    )}
                  />
                </span>
                <span className="flex-1 min-w-0 truncate text-[15px] font-semibold">
                  {lead.name}
                </span>
                {lead.delta !== undefined && (
                  <span
                    className={clsx(
                      "min-w-11 text-right text-[12.5px]",
                      lead.delta > 0
                        ? "font-bold text-theme-success dark:text-theme-success"
                        : "font-medium text-theme-muted dark:text-theme-muted",
                      settled && lead.delta > 0 && "animate-pop",
                    )}
                  >
                    +{lead.delta}
                  </span>
                )}
                <span className="min-w-[52px] text-right text-base font-bold tabular-nums">
                  <AnimatedNumber value={lead.shownScore} />
                </span>
                <span className="flex gap-0.5 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    aria-label={`Remover ${lead.name} desta partida`}
                    title="Remover — poderá voltar com o código da sala"
                    disabled={removePlayerMutation.isPending}
                    onClick={() => handleKick(lead.playerId, lead.name)}
                    className="size-[30px] rounded-[9px] flex items-center justify-center text-theme-muted dark:text-theme-muted hover:bg-theme-danger/14 hover:text-theme-danger transition-colors cursor-pointer"
                  >
                    <LuX size={17} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Bloquear ${lead.name} desta sala`}
                    title="Bloquear — não poderá voltar a esta sala"
                    onClick={() =>
                      setPlayerToBan({
                        playerId: lead.playerId,
                        name: lead.name,
                      })
                    }
                    className="size-[30px] rounded-[9px] flex items-center justify-center text-theme-muted dark:text-theme-muted hover:bg-theme-danger/14 hover:text-theme-danger transition-colors cursor-pointer"
                  >
                    <LuBan size={17} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
        <div className="sticky bottom-12 md:static px-4 md:px-[22px] py-4 border-t border-theme-primary/15 dark:border-theme-border/10 bg-theme-surface dark:bg-theme-surface rounded-b-3xl">
          <button
            type="button"
            disabled={advancing}
            data-host-next
            aria-keyshortcuts="ArrowRight"
            title="Avançar (→)"
            onClick={() => {
              setAdvancing(true);
              socket.emit("host-next");
            }}
            className={clsx(primaryButtonClass, "w-full")}
          >
            {isLastQuestion
              ? "Classificação final"
              : `Próxima pergunta · ${qIndex + 2} de ${qCount}`}
            <LuPlay size={17} className="fill-current" />
          </button>
        </div>
      </section>

      <ConfirmationModal
        open={playerToBan !== null}
        setOpen={(open) => {
          if (!open) setPlayerToBan(null);
        }}
        onClick={handleBan}
        desc={`${playerToBan?.name ?? "Este participante"} será removido e impedido de voltar a esta sala. O bloqueio dura até o encerramento da sala.`}
        confirmLabel="Bloquear participante"
        confirming={banPlayerMutation.isPending}
        confirmingLabel="Bloqueando…"
      />
    </div>
  );
}
