"use client";

import PackageImport from "../Packages/PackageImport";
import clsx from "clsx";
import { LuPlus } from "react-icons/lu";
import ActionCard from "./ActionCard";
import CreateAIQuiz from "../Gemini/CreateAIQuiz";
import ImportQuizModal from "./ImportQuizModal";
import { useAppSelector } from "@/state/hooks";

export default function QuizActionCards() {
  const view = useAppSelector((state) => state.gridListToggle.view);

  return (
    <div
      className={clsx(
        "gap-3 md:gap-4",
        view === "grid" ? "grid grid-cols-2 xl:grid-cols-4" : "flex flex-col",
      )}
    >
      <ActionCard
        view={view}
        href="/admin/quiz/createQuiz"
        icon={<LuPlus strokeWidth={2.4} />}
        title="Create a new quiz"
        subtitle="Build from the ground up"
      />
      <ImportQuizModal />
      <PackageImport kind="quiz" view={view} />
      <CreateAIQuiz />
    </div>
  );
}
