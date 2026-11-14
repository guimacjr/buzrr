"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/state/hooks";
import { setPlayers } from "@/state/admin/playersSlice";
import type { Option } from "@/types/db";
import type { PlayerPayload } from "@buzrr/contract";
import { useAdminSocket } from "@/hooks/useAdminSocket";
import ConnectionBanner from "@/components/ConnectionBanner";
import { GameTopBar } from "@/components/Game/GameUI";
import EndQuizButton from "@/components/Admin/EndQuizButton";
import GetReady from "@/components/Game/GetReady";
import QuestionScreen from "./QuestionScreen";
import QuesResult from "./QuesResult";
import LeaderBoard from "./Leaderboard";

interface QuizQuestionItem {
  title?: string;
  options?: Option[];
  id?: string;
  media?: string | null;
  mediaType?: string | null;
}

interface QuizQuestion {
  id?: string;
  title?: string;
  questions?: QuizQuestionItem[];
}

/**
 * Pure phase switch: the server pushes the current phase and this component
 * renders it. No timers or advancement decisions live on the client anymore.
 */
const GameLobby = (params: {
  roomId: string;
  userId: string;
  gameCode: string;
  players: PlayerPayload[];
  quizQuestions: QuizQuestion;
}) => {
  const controlsRef = useRef<HTMLDivElement>(null);
  const lastTouch = useRef(0);
  const lastMouseAdvance = useRef(0);
  const dispatch = useAppDispatch();
  const phase = useAppSelector((state) => state.game.phase);
  const showFinalRanking = useAppSelector(
    (state) => state.game.showFinalRanking,
  );
  const revision = useAppSelector((state) => state.game.revision);
  const [goingBack, setGoingBack] = useState(false);
  const qIndex = useAppSelector((state) => state.game.qIndex);
  const qCount = useAppSelector((state) => state.game.qCount);
  const question = useAppSelector((state) => state.game.question);
  const [dismissedSlide, setDismissedSlide] = useState<string | null>(null);
  const fullScreen =
    phase === "question" &&
    question?.type === "media_slide" &&
    Boolean(question.fullScreen) &&
    dismissedSlide !== question.id;

  useEffect(() => {
    dispatch(setPlayers(params.players));
  }, [dispatch, params.players]);

  const { socket } = useAdminSocket({
    gameCode: params.gameCode,
  });

  const canGoBack =
    (phase === "question" || phase === "reveal" || phase === "final") &&
    (qIndex > 0 || phase === "final");
  const goBack = useCallback(() => {
    if (!socket?.connected || !canGoBack || goingBack) return;
    setGoingBack(true);
    socket.timeout(5000).emit("host-back", { revision }, (error, result) => {
      setGoingBack(false);
      if (error || !result?.accepted) {
        toast.error("Não foi possível voltar. Tente novamente.");
        socket.emit("request-sync");
      }
    });
  }, [socket, canGoBack, goingBack, revision]);

  useEffect(() => {
    const advance = (event: KeyboardEvent) => {
      if (event.key === "Escape" && fullScreen && question) {
        setDismissedSlide(question.id);
        return;
      }
      if (
        (event.key !== "ArrowRight" && event.key !== "ArrowLeft") ||
        event.repeat ||
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        !socket?.connected ||
        document.querySelector('.MuiModal-root, [role="dialog"], dialog[open]')
      )
        return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest(
            'input, textarea, select, video, audio, [role="slider"], [role="combobox"], [role="tablist"]',
          ))
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBack();
        return;
      }
      if (fullScreen) {
        event.preventDefault();
        socket.emit("host-next");
        return;
      }
      const button = controlsRef.current?.querySelector<HTMLButtonElement>(
        "button[data-host-next]",
      );
      if (!button || button.disabled) return;
      event.preventDefault();
      // Reuse the visible action, including its pending state. The server
      // still decides whether Next reveals answers or opens the next item.
      button.click();
    };
    window.addEventListener("keydown", advance);
    return () => window.removeEventListener("keydown", advance);
  }, [socket, fullScreen, question, goBack]);

  // The final leaderboard shows for both phases, but a classic game only
  // persists its GameResult when endGame runs. At "final" that hasn't happened
  // yet, so the button must still end (and save); only "ended" is a plain exit.
  const showLeaderboard = phase === "final" || phase === "ended";
  const alreadyEnded = phase === "ended";
  const inGame = phase === "question" || phase === "reveal" || showLeaderboard;
  const title = params.quizQuestions?.title ?? "Quiz";

  if (!socket) return null;

  if (!inGame) {
    // idle / lobby / starting — the pre-question countdown
    return (
      <>
        <ConnectionBanner />
        <GetReady title={title} />
      </>
    );
  }

  if ((phase === "final" || phase === "ended") && !showFinalRanking) {
    return (
      <div className="p-10 text-center text-theme-text">
        <h1 className="text-3xl font-bold">Quiz encerrado</h1>
        <a className="mt-6 inline-block underline" href="/admin">
          Voltar aos quizzes
        </a>
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black"
        onDoubleClick={() => {
          if (question?.mediaType === "video") setDismissedSlide(question.id);
        }}
        onPointerUp={(event) => {
          const now = performance.now();
          if (
            event.pointerType === "mouse" &&
            event.button === 0 &&
            event.target instanceof HTMLImageElement &&
            socket.connected
          ) {
            // A double click must not skip the following slide.
            if (
              lastMouseAdvance.current === 0 ||
              now - lastMouseAdvance.current > 500
            ) {
              lastMouseAdvance.current = now;
              socket.emit("host-next");
            }
            return;
          }
          if (event.pointerType !== "touch") return;
          if (lastTouch.current > 0 && now - lastTouch.current < 350) {
            setDismissedSlide(question!.id);
            lastTouch.current = 0;
          } else {
            lastTouch.current = now;
          }
        }}
      >
        <QuestionScreen socket={socket} gameCode={params.gameCode} fullScreen />
      </div>
    );
  }

  return (
    <div
      ref={controlsRef}
      className="w-full max-w-7xl mx-auto flex flex-col px-4 sm:px-6 lg:px-8 pb-4 md:pb-0 md:h-[calc(100dvh-10rem)] text-theme-text dark:text-theme-text"
    >
      <ConnectionBanner />
      <button
        type="button"
        disabled={!canGoBack || goingBack || !socket.connected}
        onClick={goBack}
        aria-keyshortcuts="ArrowLeft"
        className="mb-3 self-start rounded-lg px-3 py-2 font-semibold bg-theme-surface text-theme-text disabled:opacity-40"
      >
        ← Voltar
      </button>
      <GameTopBar
        title={title}
        qIndex={qIndex}
        qCount={qCount}
        final={showLeaderboard}
        gameCode={phase === "reveal" ? params.gameCode : undefined}
        right={
          <EndQuizButton
            inline
            roomId={params.roomId}
            alreadyEnded={alreadyEnded}
          />
        }
      />
      {phase === "question" ? (
        <QuestionScreen socket={socket} gameCode={params.gameCode} />
      ) : phase === "reveal" ? (
        <QuesResult socket={socket} roomId={params.roomId} />
      ) : (
        <LeaderBoard
          roomId={params.roomId}
          quizTitle={title}
          alreadyEnded={alreadyEnded}
        />
      )}
    </div>
  );
};

export default GameLobby;
