"use client";

import { toast } from "react-toastify";
import { Switch } from "@/components/ui/Switch";
import { useQuizPresentationMutation } from "@/lib/modules/quizzes/hooks";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function QuizPresentationSettings({
  quizId,
  showFinalRanking,
}: {
  quizId: string;
  showFinalRanking: boolean;
}) {
  const mutation = useQuizPresentationMutation(quizId);
  return (
    <section className="rounded-xl border border-theme-primary/20 p-4 text-theme-text">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-bold">
            Mostrar classificação final e participantes
          </h2>
          <p className="mt-1 text-sm text-theme-muted">
            Desative para encerrar o quiz sem exibir a tela final. Os resultados
            continuam salvos no histórico.
          </p>
          <p className="mt-1 text-sm text-theme-muted">
            Aplica-se às partidas iniciadas após salvar.
          </p>
        </div>
        <Switch
          aria-label="Mostrar classificação final e participantes"
          className="shrink-0"
          checked={showFinalRanking ?? true}
          disabled={mutation.isPending}
          onCheckedChange={(value) =>
            mutation.mutate(
              { showFinalRanking: value },
              {
                onSuccess: () => toast.success("Configuração do quiz salva."),
                onError: (error) => toast.error(getApiErrorMessage(error)),
              },
            )
          }
        />
      </div>
    </section>
  );
}
