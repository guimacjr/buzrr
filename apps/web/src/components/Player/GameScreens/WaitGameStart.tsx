import Game from "@/components/Game";
import BackNavButton from "@/components/BackNavButton";
import { DEFAULT_AVATAR } from "@/constants";
import type { GameSession } from "@/types/db";
import Image from "next/image";

interface PlayerWithProfile {
  id?: string;
  profilePic?: string;
  name?: string;
  [key: string]: unknown;
}

interface GameWithQuiz extends GameSession {
  quiz: { title?: string };
  creator?: { name?: string | null; image?: string | null };
}

const WaitGameStart = (params: {
  player: PlayerWithProfile;
  game: GameWithQuiz;
  /** Back/leave action — opens the "you'll leave the game" confirmation. */
  onLeave?: () => void;
}) => {
  const game = params.game;

  return (
    <>
      <div className="px-4 py-2">
        <div className="w-full h-[81dvh] flex gap-4 md:justify-center *:bg-theme-surface dark:*:bg-theme-surface *:rounded-xl">
          <div className="w-full md:w-[26vw] md:max-w-sm p-4 hidden md:flex md:flex-col">
            <div className="self-start">
              <BackNavButton onBack={params.onLeave} />
            </div>
            <h1 className="text-5xl py-2 font-extrabold dark:text-theme-text">
              {game.quiz.title}
            </h1>
            <h2 className="text-sm mt-8 p-2 dark:text-theme-text">
              Você entrou como
            </h2>
            <div className="flex justify-between items-center w-fit gap-2 rounded-full p-3 bg-theme-card dark:bg-theme-card font-bold text-theme-text dark:text-theme-text">
              <Image
                unoptimized
                src={params.player.profilePic || DEFAULT_AVATAR}
                width={50}
                height={50}
                alt="Perfil"
                className="rounded-full h-8 w-8"
              />
              {params.player.name}
            </div>
            <div className="flex flex-col mt-10">
              <p className="text-sm dark:text-theme-muted py-1">
                Código da sala
              </p>
              <h2 className="text-4xl font-extrabold dark:text-theme-text py-1">
                {game.gameCode}
              </h2>
            </div>
            <div className="mt-auto">
              <p className="text-sm dark:text-theme-muted py-2">Quiz de</p>
              <Image
                src={game.creator?.image ?? DEFAULT_AVATAR}
                width={50}
                height={50}
                alt="Perfil"
                className="rounded-full h-8 w-8 inline"
              />
              <h2 className="dark:text-theme-text inline p-2">
                {game.creator?.name}
              </h2>
            </div>
          </div>
          <div className="md:w-[45vw] w-full flex flex-col p-2 md:p-4">
            <h1 className="text-2xl py-2 font-extrabold dark:text-theme-text md:hidden">
              {game.quiz.title}
            </h1>
            <h2 className="text-xs p-2 dark:text-theme-text md:hidden">
              Você entrou como
            </h2>
            <div className="text-xs flex justify-between items-center w-fit gap-2 rounded-full p-2 mb-2 bg-theme-card dark:bg-theme-card font-bold text-theme-text dark:text-theme-text md:hidden">
              <Image
                unoptimized
                src={params.player.profilePic || DEFAULT_AVATAR}
                width={50}
                height={50}
                alt="Perfil"
                className="rounded-full h-5 w-5"
              />
              {params.player.name}
            </div>
            <Game />
            <div className="flex flex-col mt-2 md:hidden">
              <p className="text-xs dark:text-theme-muted">Código da sala</p>
              <h2 className="text-2xl font-extrabold dark:text-theme-text">
                {game.gameCode}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default WaitGameStart;
