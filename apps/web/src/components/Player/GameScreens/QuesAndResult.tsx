"use client";
import clsx from "clsx";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  LuArrowDown,
  LuArrowUp,
  LuCheck,
  LuClock,
  LuSend,
  LuTrophy,
  LuX,
} from "react-icons/lu";
import type { PublicQuestion, QuestionAnswer } from "@buzrr/contract";
import { DEFAULT_AVATAR } from "@/constants";
import { useAppSelector } from "@/state/hooks";
import type { Standing } from "@/state/game/gameSlice";
import { useServerCountdown } from "@/hooks/useServerCountdown";
import { AnswerInput, QuestionTypePill } from "@/components/QuestionTypes";
import {
  GameTopBar,
  StatTile,
  TimerBar,
  TimerRing,
  WaitingDots,
  mutedText,
  ordinal,
  panelClass,
  subtleCardClass,
} from "@/components/Game/GameUI";

const STATUS = {
  correct: {
    heading: "Resposta correta!",
    icon: <LuCheck size={56} strokeWidth={3} />,
    circle:
      "bg-theme-success shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-theme-success)_14%,transparent),0_0_0_16px_color-mix(in_srgb,var(--color-theme-success)_6%,transparent)] md:shadow-[0_0_0_14px_color-mix(in_srgb,var(--color-theme-success)_14%,transparent),0_0_0_30px_color-mix(in_srgb,var(--color-theme-success)_6%,transparent)]",
    accent: "text-theme-success dark:text-theme-success",
    answer: "border-theme-success bg-theme-success/8",
  },
  incorrect: {
    heading: "Resposta incorreta",
    icon: <LuX size={56} strokeWidth={3} />,
    circle:
      "bg-theme-danger shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-theme-danger)_14%,transparent),0_0_0_16px_color-mix(in_srgb,var(--color-theme-danger)_6%,transparent)] md:shadow-[0_0_0_14px_color-mix(in_srgb,var(--color-theme-danger)_14%,transparent),0_0_0_30px_color-mix(in_srgb,var(--color-theme-danger)_6%,transparent)]",
    accent: "text-theme-danger",
    answer: "border-theme-danger bg-theme-danger/8",
  },
  /** An unscored question (poll, word cloud, …): nothing to get right. */
  received: {
    heading: "Resposta recebida",
    icon: <LuSend size={48} strokeWidth={2.6} />,
    circle:
      "bg-theme-primary dark:bg-theme-primary shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-theme-primary)_14%,transparent),0_0_0_16px_color-mix(in_srgb,var(--color-theme-primary)_6%,transparent)] md:shadow-[0_0_0_14px_color-mix(in_srgb,var(--color-theme-primary)_14%,transparent),0_0_0_30px_color-mix(in_srgb,var(--color-theme-primary)_6%,transparent)]",
    accent: "text-theme-primary dark:text-theme-primary",
    answer:
      "border-theme-primary/40 dark:border-theme-primary/40 bg-theme-primary/8",
  },
  timesout: {
    heading: "Tempo esgotado!",
    icon: <LuClock size={52} strokeWidth={2.6} />,
    circle:
      "bg-theme-warning shadow-[0_0_0_8px_color-mix(in_srgb,var(--color-theme-warning)_14%,transparent),0_0_0_16px_color-mix(in_srgb,var(--color-theme-warning)_6%,transparent)] md:shadow-[0_0_0_14px_color-mix(in_srgb,var(--color-theme-warning)_14%,transparent),0_0_0_30px_color-mix(in_srgb,var(--color-theme-warning)_6%,transparent)]",
    accent: "text-theme-warning dark:text-theme-warning",
    answer: "border-theme-warning bg-theme-warning/8",
  },
} as const;

/** Places climbed (positive) or dropped since the reveal before. */
function rankMove(standing: Standing): number {
  return standing.previousRank === null
    ? 0
    : standing.previousRank - standing.rank;
}

/** "▲ 2" / "▼ 1" beside a rank; nothing when it didn't change. */
function RankMove({ move }: { move: number }) {
  if (move === 0) return null;
  const up = move > 0;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-0.5 font-bold",
        up ? "text-theme-success dark:text-theme-success" : "text-theme-danger",
      )}
    >
      {up ? (
        <LuArrowUp size={14} strokeWidth={3} />
      ) : (
        <LuArrowDown size={14} strokeWidth={3} />
      )}
      <span className="sr-only">{up ? "subiu" : "desceu"}</span>
      {Math.abs(move)}
    </span>
  );
}

/** The player's place from the last reveal, in the top bar while answering. */
function StandingChip({ standing }: { standing: Standing }) {
  return (
    <span
      title="Sua posição após a última pergunta"
      className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-theme-primary/15 dark:border-theme-border/10 bg-theme-surface dark:bg-theme-surface/5 px-3 py-1.5 text-[13px] font-semibold"
    >
      <LuTrophy
        size={14}
        className="text-theme-primary dark:text-theme-primary"
        aria-hidden="true"
      />
      <span className="sr-only">Sua posição</span>
      {ordinal(standing.rank)}
    </span>
  );
}

/** Podium places in medal colours; everyone else in the brand colour. */
const PLACE_TEXT: Record<number, string> = {
  1: "text-theme-gold dark:text-theme-gold",
  2: "text-theme-silver dark:text-theme-muted",
  3: "text-theme-bronze dark:text-theme-bronze",
};

/** A line of encouragement for where the player stands. */
function standingMessage(rank: number, playerCount: number): string {
  if (playerCount <= 1) return "Jogando sozinho — cada ponto conta!";
  if (rank === 1) return "Você está na liderança — continue assim!";
  if (rank <= 3) return "Parabéns, você está no pódio — continue assim!";
  const below = rank - 3;
  return below === 1
    ? "Falta só uma posição para o pódio — você consegue!"
    : `${below} posições abaixo do pódio — continue!`;
}

/** The player's place after this question, under the answers. */
function StandingCard({
  standing,
  playerCount,
}: {
  standing: Standing;
  playerCount: number;
}) {
  const podium = standing.rank <= 3 && playerCount > 1;
  return (
    <div
      className={clsx(
        "mt-4 md:mt-6 w-full max-w-[420px] rounded-2xl px-5 py-4 md:py-5 flex flex-col items-center gap-1.5 animate-fade-up [animation-delay:250ms]",
        subtleCardClass,
      )}
    >
      <span
        className={clsx(
          "text-[12.5px] font-bold tracking-[0.06em] uppercase",
          mutedText,
        )}
      >
        Sua classificação
      </span>
      <p className="flex flex-wrap items-baseline justify-center gap-x-2 text-lg md:text-xl font-semibold">
        <span>Você está em</span>
        <b
          className={clsx(
            "inline-flex items-center gap-1.5 text-[30px] md:text-[36px] font-extrabold tracking-[-0.02em] leading-none",
            PLACE_TEXT[standing.rank] ??
              "text-theme-primary dark:text-theme-primary",
          )}
        >
          {podium && <LuTrophy size={24} aria-hidden="true" />}
          {ordinal(standing.rank)}
        </b>
        <span>
          lugar
          {playerCount > 1 && ` entre ${playerCount}`}
        </span>
        <RankMove move={rankMove(standing)} />
      </p>
      <p className="text-[15px] font-semibold">
        {standingMessage(standing.rank, playerCount)}
      </p>
      <p className={clsx("text-[13.5px]", mutedText)}>
        <b className="text-theme-text dark:text-theme-text tabular-nums">
          {standing.totalScore.toLocaleString("pt-BR")}
        </b>{" "}
        pontos no total
      </p>
    </div>
  );
}

/** One labelled answer; `children` is the answer as its type renders it. */
function AnswerRow({
  label,
  children,
  className,
  emptyText,
}: {
  label: string;
  children?: ReactNode;
  className?: string;
  emptyText?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 md:gap-2 w-full">
      <span className="text-xs font-semibold tracking-[0.1em] uppercase text-theme-muted dark:text-theme-muted">
        {label}
      </span>
      <div
        className={clsx(
          "flex items-center gap-3.5 rounded-2xl border-[1.5px] px-4 py-2.5 md:px-[18px] md:py-3.5 text-base md:text-[17px] font-semibold text-left",
          className,
        )}
      >
        {children ? children : <span className={mutedText}>{emptyText}</span>}
      </div>
    </div>
  );
}

const QuestionAndResult = (params: {
  question?: PublicQuestion;
  quizTitle: string;
  gameCode: string;
  screen: "question" | "result";
  submitAnswer?: (answer: QuestionAnswer) => void;
  /** The answer sent (or being sent) for the open question. */
  answer?: QuestionAnswer | null;
  locked?: boolean;
  /** The question takes more answers: no "waiting" footer after one. */
  canAddMore?: boolean;
  status?: keyof typeof STATUS;
  /** Points earned this question (result screen). */
  points?: number;
  /** The player's answer, rendered by its question type (result screen). */
  yourAnswer?: ReactNode | null;
  /** The right answer(s), rendered by the question type (result screen). */
  correctAnswers?: ReactNode[];
  /** Hide the "Room code" line (e.g. 1v1 duels, where the code is internal). */
  hideRoomCode?: boolean;
  /** Host of the quiz — shown as "Quiz by". Omitted for duels (no host). */
  hostName?: string | null;
  hostImage?: string | null;
}) => {
  const deadline = useAppSelector((state) => state.game.deadline);
  const connection = useAppSelector((state) => state.game.connection);
  const qIndex = useAppSelector((state) => state.game.qIndex);
  const qCount = useAppSelector((state) => state.game.qCount);
  const players = useAppSelector((state) => state.game.players);
  const you = useAppSelector((state) => state.game.you);
  // Duels show both scores in their own header instead.
  const standing = useAppSelector((state) =>
    state.game.mode === "classic" ? state.game.standing : null,
  );
  // Answers submitted while offline would be rejected anyway — lock the UI.
  const offline = connection !== "connected";
  // Display-only countdown against the server deadline; the reveal is pushed
  // by the server regardless of what this shows.
  const remaining = useServerCountdown(deadline);
  const timeOut = params?.question?.timeOut ?? 1;
  const isQuestion = params.screen === "question";
  const status = STATUS[params.status ?? "timesout"];
  const isLast = qCount > 0 && qIndex >= qCount - 1;
  // The player page scrolls as a whole, so size the title by length rather
  // than overflow: a long title, or long options below it, gets a smaller one.
  const longTitle =
    (params.question?.title.length ?? 0) > 120 ||
    (params.question !== undefined &&
      "options" in params.question &&
      params.question.options.some((o) => o.title.length > 80));

  function handleSubmit(answer: QuestionAnswer) {
    if (params.locked || offline) return;
    params?.submitAnswer?.(answer);
  }

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col px-4 sm:px-6 lg:px-8 pb-16 md:pb-6 md:min-h-[calc(100dvh-7.5rem)] text-theme-text dark:text-theme-text">
      <GameTopBar
        title={params.quizTitle}
        qIndex={qIndex}
        qCount={qCount}
        right={
          isQuestion && standing ? (
            <StandingChip standing={standing} />
          ) : undefined
        }
      />
      {isQuestion && (
        <TimerBar
          key={params.question?.id ?? params.question?.title}
          value={remaining}
          max={timeOut}
          className="mb-2.5 md:hidden"
        />
      )}
      <div className="flex-1 flex flex-col md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3.5 md:gap-5">
        <section
          className={clsx(
            panelClass,
            "hidden md:flex flex-col justify-center gap-6 p-[30px]",
          )}
        >
          <div className="flex items-center gap-[26px]">
            {isQuestion ? (
              <TimerRing
                key={params.question?.id ?? params.question?.title}
                value={Math.ceil(remaining)}
                max={timeOut}
                label="seconds"
                className="size-[150px]"
                valueClassName="text-5xl"
              />
            ) : (
              <TimerRing
                value={0}
                max={1}
                label="tempo esgotado"
                className="size-[150px]"
                valueClassName="text-5xl"
              />
            )}
            <div className="flex flex-col gap-2.5 min-w-0">
              <h2 className="text-xl md:text-[30px] font-bold tracking-[-0.02em] truncate capitalize">
                {params.quizTitle}
              </h2>
              {!params.hideRoomCode && (
                <span
                  className={clsx(
                    "text-[13px] md:text-sm whitespace-nowrap",
                    mutedText,
                  )}
                >
                  Código da sala{" "}
                  <b className="tracking-[0.08em] text-theme-text dark:text-theme-text">
                    {params.gameCode}
                  </b>
                </span>
              )}
              {qCount > 0 && (
                <span
                  className={clsx(
                    "text-[13px] md:text-sm whitespace-nowrap",
                    mutedText,
                  )}
                >
                  Pergunta {qIndex + 1} de {qCount}
                </span>
              )}
            </div>
          </div>
          {params.hostName && (
            <div
              className={clsx(
                "hidden md:flex items-center gap-3 rounded-2xl px-4 py-3.5",
                subtleCardClass,
              )}
            >
              <Image
                src={params.hostImage || DEFAULT_AVATAR}
                width={42}
                height={42}
                alt=""
                className="size-[42px] rounded-full object-cover"
              />
              <div className={clsx("flex flex-col text-[12.5px]", mutedText)}>
                Quiz de
                <b className="text-[15px] font-semibold text-theme-text dark:text-theme-text">
                  {params.hostName}
                </b>
              </div>
            </div>
          )}
          {!isQuestion && you && (
            <div className="hidden md:grid grid-cols-2 gap-3">
              <StatTile
                value={you.rank ? ordinal(you.rank) : "—"}
                suffix={players.length > 0 ? ` /${players.length}` : undefined}
                label="Sua posição"
              />
              <StatTile
                value={you.totalScore.toLocaleString("pt-BR")}
                label="Total de pontos"
              />
            </div>
          )}
        </section>

        {isQuestion ? (
          <section
            className={clsx(
              panelClass,
              "flex flex-col p-4 md:px-[34px] md:py-8",
            )}
          >
            {params.question?.mediaType === "image" &&
              params.question.media && (
                <Image
                  src={params.question.media}
                  className="mb-4 md:mb-5 mx-auto max-h-[28dvh] w-auto rounded-2xl"
                  alt="Imagem da pergunta"
                  height={320}
                  width={500}
                />
              )}
            <div
              className={clsx(
                "flex flex-wrap items-center gap-2",
                params.question?.type !== "multiple_choice" && "mb-3 md:mb-0",
              )}
            >
              {params.question &&
                params.question.type !== "multiple_choice" && (
                  <QuestionTypePill type={params.question.type} />
                )}
              <span className="hidden md:inline-block w-fit text-[12.5px] font-bold tracking-[0.06em] uppercase rounded-full px-3 py-1.5 text-theme-primary dark:text-theme-primary bg-theme-primary/8 dark:bg-theme-surface/5">
                Pergunta {qIndex + 1}
                {qCount > 0 && ` de ${qCount}`}
              </span>
            </div>
            <h2
              className={clsx(
                "md:mt-[18px] font-bold tracking-[-0.02em] leading-[1.22] text-pretty wrap-break-word animate-fade-up",
                longTitle
                  ? "text-lg md:text-[26px]"
                  : "text-[22px] md:text-[34px]",
              )}
            >
              {params.question?.title ?? ""}
            </h2>
            {params.question && (
              <AnswerInput
                question={params.question}
                selected={params.answer ?? null}
                disabled={offline || Boolean(params.locked)}
                onSubmit={handleSubmit}
              />
            )}
            {params.locked && !params.canAddMore && (
              <div className="mt-6 flex justify-center animate-fade-up">
                <WaitingDots>
                  Resposta recebida — aguardando o resultado
                </WaitingDots>
              </div>
            )}
          </section>
        ) : (
          <section
            className={clsx(
              panelClass,
              "flex flex-col items-center justify-center text-center gap-1.5 md:gap-2.5 px-5 pt-7 pb-5 md:p-10",
            )}
          >
            <div
              className={clsx(
                "size-16 md:size-[120px] rounded-full text-theme-onPrimary flex items-center justify-center mb-5 md:mb-[22px] animate-pop-in [&_svg]:size-8 md:[&_svg]:size-auto",
                status.circle,
                params.status === "incorrect" && "animate-shake",
              )}
            >
              {status.icon}
            </div>
            <h2 className="text-[26px] md:text-[40px] font-extrabold tracking-[-0.02em]">
              {status.heading}
            </h2>
            <span
              className={clsx(
                "text-lg md:text-[26px] font-bold animate-fade-up",
                status.accent,
              )}
            >
              {params.status === "timesout"
                ? "Você não respondeu nesta rodada"
                : params.status === "received"
                  ? "Sem pontuação — obrigado por responder"
                  : `+${params.points ?? 0} pontos`}
            </span>
            <div className="mt-3 md:mt-[22px] flex flex-col gap-3 md:gap-4 w-full max-w-[420px] animate-fade-up [animation-delay:150ms]">
              <AnswerRow
                label="Sua resposta"
                className={status.answer}
                emptyText="Você não respondeu a tempo"
              >
                {params.yourAnswer}
              </AnswerRow>
              {params.status !== "correct" &&
                params.status !== "received" &&
                params.correctAnswers?.map((node, i) => (
                  <AnswerRow
                    key={i}
                    label="Resposta correta"
                    className={STATUS.correct.answer}
                  >
                    {node}
                  </AnswerRow>
                ))}
            </div>
            {standing && standing.qIndex === qIndex && (
              <StandingCard standing={standing} playerCount={players.length} />
            )}
            <div className="mt-4 md:mt-[26px]">
              <WaitingDots>
                {params.hideRoomCode
                  ? isLast
                    ? "O resultado final vem a seguir"
                    : "A próxima pergunta vem a seguir"
                  : isLast
                    ? "Aguardando o resultado final"
                    : `Aguardando o administrador iniciar a pergunta ${qIndex + 2}`}
              </WaitingDots>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default QuestionAndResult;
