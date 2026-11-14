"use client";

import clsx from "clsx";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { LuCheck, LuCopy, LuPlay, LuShare2 } from "react-icons/lu";
import { toast } from "react-toastify";
import { useAppSelector } from "@/state/hooks";
import { useServerCountdown } from "@/hooks/useServerCountdown";
import { buildJoinUrl } from "@/lib/join-link";
import {
  HostPrompt,
  QuestionTypePill,
  isScoredType,
} from "@/components/QuestionTypes";
import {
  TimerRing,
  labelClass,
  mutedText,
  panelClass,
  primaryButtonClass,
  subtleCardClass,
} from "@/components/Game/GameUI";
import type { GameSocket } from "@/types/socket";

interface QuestionScreenProps {
  gameCode: string;
  socket: GameSocket;
  fullScreen?: boolean;
}

/**
 * Renders the server-pushed question. The countdown is display-only — the
 * server ends the question at its own deadline; "Next" just asks the server
 * to skip ahead.
 */
export default function QuestionScreen(props: QuestionScreenProps) {
  const { gameCode, socket, fullScreen = false } = props;
  const question = useAppSelector((state) => state.game.question);
  const deadline = useAppSelector((state) => state.game.deadline);
  const qIndex = useAppSelector((state) => state.game.qIndex);
  const qCount = useAppSelector((state) => state.game.qCount);
  const answered = useAppSelector((state) => state.game.answeredCount);
  const players = useAppSelector((state) => state.game.players);
  const live = useAppSelector((state) => state.game.liveSummary);
  const remaining = useServerCountdown(deadline);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const promptRef = useRef<HTMLElement>(null);
  // Per-question: once the prompt panel overflows, drop to a smaller title so
  // less scrolling is needed. One-way so it can't flip back and forth.
  const [compact, setCompact] = useState<{ id: string; on: boolean }>();
  const questionId = question?.id;
  const isCompact = compact?.id === questionId && compact?.on;

  useLayoutEffect(() => {
    const el = promptRef.current;
    if (!el || !questionId || isCompact) return;
    const check = () => {
      if (el.scrollHeight > el.clientHeight + 1)
        setCompact({ id: questionId, on: true });
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    for (const child of el.children) observer.observe(child);
    return () => observer.disconnect();
  }, [questionId, isCompact]);

  useEffect(() => {
    setCanShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  if (!question) return null;

  if (question.type === "media_slide")
    return (
      <section
        className={
          fullScreen
            ? "h-dvh w-full overflow-hidden"
            : clsx(panelClass, "flex flex-col items-center gap-5 p-6")
        }
      >
        {!fullScreen && (
          <>
            <QuestionTypePill type="media_slide" />
            <h2>{question.title}</h2>
          </>
        )}
        {question.media &&
          (question.mediaType === "video" ? (
            <video
              key={question.id}
              src={question.media}
              controls={!fullScreen}
              autoPlay
              onLoadedData={async (event) => {
                const video = event.currentTarget;
                try {
                  await video.play();
                } catch (error) {
                  // Browsers may block audible autoplay; keep playback automatic
                  // and let the host enable sound using the native controls.
                  if (
                    error instanceof DOMException &&
                    error.name === "NotAllowedError"
                  ) {
                    video.muted = true;
                    await video.play().catch(() => undefined);
                  }
                }
              }}
              playsInline
              className={
                fullScreen
                  ? "h-full w-full object-contain"
                  : "max-h-[65dvh] max-w-full"
              }
            />
          ) : (
            <Image
              src={question.media}
              alt={question.title}
              width={1200}
              height={800}
              unoptimized
              className={
                fullScreen
                  ? "h-full w-full object-contain cursor-pointer"
                  : "max-h-[65dvh] w-auto object-contain"
              }
            />
          ))}
        {!fullScreen && (
          <>
            <p>Os participantes estão aguardando a próxima pergunta.</p>
            <button
              type="button"
              className={primaryButtonClass}
              data-host-next
              aria-keyshortcuts="ArrowRight"
              title="Avançar (→)"
              onClick={() => socket.emit("host-next")}
            >
              Avançar <LuPlay />
            </button>
          </>
        )}
      </section>
    );

  const joinUrl = buildJoinUrl(gameCode);
  const total = Math.max(players.filter((p) => p.connected).length, answered);
  const answeredPct = total > 0 ? (answered / total) * 100 : 0;
  const left = qCount - (qIndex + 1);
  const scored = isScoredType(question.type);

  return (
    <div className="flex-1 min-h-0 flex flex-col md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3.5 md:gap-5 md:pb-[18px]">
      <section
        className={clsx(
          panelClass,
          "flex flex-col justify-center gap-6 md:gap-[30px] p-5 md:p-7 md:min-h-0 md:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        <div className="flex items-center gap-5 md:gap-6">
          <TimerRing
            key={question.id}
            value={Math.ceil(remaining)}
            max={question.timeOut}
            className="size-[120px] md:size-[180px]"
            valueClassName="text-4xl md:text-[58px]"
          />
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <span className={labelClass}>Respostas recebidas</span>
            <span className={clsx("text-[13.5px]", mutedText)}>
              <b className="text-[22px] font-bold text-theme-text dark:text-theme-text">
                {answered}
              </b>{" "}
              / {total}
            </span>
            <div className="h-2 rounded-lg overflow-hidden bg-theme-primary/8 dark:bg-theme-surface/5">
              <div
                className="h-full rounded-lg bg-linear-to-br from-theme-accent to-theme-accentDeep dark:from-theme-accent dark:to-theme-accentDeep transition-[width] duration-300"
                style={{ width: `${answeredPct}%` }}
              />
            </div>
            <span className={clsx("text-[13px]", mutedText)}>
              {Math.max(0, total - answered)} ainda pensando
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className={labelClass}>Novos participantes</span>
          <div
            className={clsx(
              "flex items-center gap-4 rounded-[18px] p-4",
              subtleCardClass,
            )}
          >
            <div className="size-[90px] md:size-[136px] shrink-0 rounded-[10px] bg-theme-surface p-1.5">
              <QRCodeSVG
                value={joinUrl}
                marginSize={0}
                level="M"
                className="size-full"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <span className="text-[28px] font-extrabold tracking-[0.12em] leading-none text-theme-primary dark:text-theme-primary">
                {gameCode}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    (
                      navigator.clipboard?.writeText(joinUrl) ??
                      Promise.reject(
                        new Error("Área de transferência indisponível"),
                      )
                    )
                      .then(() => setCopied(true))
                      .catch(() =>
                        toast.error("Não foi possível copiar o link"),
                      )
                  }
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] bg-theme-surface dark:bg-theme-surface px-3 py-2 text-[13px] font-semibold whitespace-nowrap cursor-pointer transition-colors",
                    copied
                      ? "border-theme-success text-theme-success"
                      : "border-theme-primary/15 dark:border-theme-border/5 hover:border-theme-primary",
                  )}
                >
                  {copied ? <LuCheck size={15} /> : <LuCopy size={15} />}
                  {copied ? "Copiado" : "Copiar link"}
                </button>
                {canShare && (
                  <button
                    type="button"
                    onClick={() =>
                      navigator.share({ url: joinUrl }).catch(() => {})
                    }
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] bg-theme-surface dark:bg-theme-surface border-theme-primary/15 dark:border-theme-border/5 hover:border-theme-primary px-3 py-2 text-[13px] font-semibold cursor-pointer transition-colors"
                  >
                    <LuShare2 size={15} />
                    Compartilhar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={promptRef}
        data-host-poll-panel={question.type === "poll" ? "" : undefined}
        className={clsx(
          panelClass,
          "flex flex-col p-5 md:px-[34px] md:py-8 md:min-h-0 md:overflow-y-auto",
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[12.5px] font-bold tracking-[0.06em] uppercase rounded-full px-3 py-1.5 text-theme-primary dark:text-theme-primary bg-theme-primary/8 dark:bg-theme-surface/5">
            Pergunta {qIndex + 1} de {qCount}
          </span>
          {question.type !== "multiple_choice" && (
            <QuestionTypePill type={question.type} />
          )}
          <span className={clsx("text-[13px]", mutedText)}>
            {scored
              ? `${question.timeOut}s para responder`
              : "Sem pontuação · resultados em tempo real"}
          </span>
        </div>
        {question.mediaType === "image" && question.media && (
          <Image
            src={question.media}
            className="mt-5 mx-auto max-h-[26dvh] w-auto rounded-2xl"
            alt="Imagem da pergunta"
            height={300}
            width={500}
          />
        )}
        <h2
          className={clsx(
            "mt-[18px] font-bold tracking-[-0.02em] leading-[1.22] text-pretty wrap-break-word",
            isCompact ? "text-xl md:text-[26px]" : "text-2xl md:text-[34px]",
          )}
        >
          {question.title}
        </h2>
        <HostPrompt
          question={question}
          live={live?.index === qIndex ? live.summary : null}
        />
        <div className="flex flex-wrap md:flex-nowrap items-center gap-3.5 mt-[22px] pt-5 border-t border-theme-primary/15 dark:border-theme-border/10">
          <p
            className={clsx(
              "basis-full md:basis-auto flex-1 text-sm",
              mutedText,
            )}
          >
            {left > 0
              ? `${left} pergunta${left === 1 ? "" : "s"} restante${left === 1 ? "" : "s"} após esta`
              : "Esta é a última pergunta"}
          </p>
          <button
            type="button"
            data-host-next
            aria-keyshortcuts="ArrowRight"
            title="Avançar (→)"
            onClick={() => socket.emit("host-next")}
            className={clsx(primaryButtonClass, "flex-1 md:flex-none")}
          >
            Avançar
            <LuPlay size={17} className="fill-current" />
          </button>
        </div>
      </section>
    </div>
  );
}
