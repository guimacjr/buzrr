"use client";

import { useState } from "react";
import { FiFlag } from "react-icons/fi";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/lib/api/errors";
import { useReportQuestionMutation } from "@/lib/modules/moderation/hooks";
import { IconButton } from "@/components/ui/IconButton";

/** Duel-only: lets a player flag the current question as wrong/NSFW for admin review. */
export default function ReportQuestionButton({
  questionId,
}: {
  questionId: string;
}) {
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());
  const report = useReportQuestionMutation();
  const reported = reportedIds.has(questionId);

  function handleReport() {
    if (reported) return;
    report.mutate(questionId, {
      onSuccess: () => {
        setReportedIds((prev) => new Set(prev).add(questionId));
        toast.success("Reported — thanks for the feedback.");
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  return (
    <IconButton
      aria-label={reported ? "Question reported" : "Report this question"}
      icon={<FiFlag size={18} />}
      disabled={reported || report.isPending}
      onClick={handleReport}
      className={
        reported
          ? "text-theme-muted dark:text-theme-muted"
          : "text-theme-danger dark:text-theme-danger hover:bg-theme-danger/10 dark:hover:bg-theme-danger/10"
      }
    />
  );
}
