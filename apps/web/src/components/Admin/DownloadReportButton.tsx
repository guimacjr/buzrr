"use client";
import { useState } from "react";
import { toast } from "react-toastify";
import { getAuthApiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function DownloadReportButton({
  resultId,
}: {
  resultId: string;
}) {
  const [pending, setPending] = useState(false);
  async function download() {
    setPending(true);
    try {
      const response = await getAuthApiClient().get<string>(
        `/game-sessions/results/${encodeURIComponent(resultId)}/report`,
        { responseType: "text" },
      );
      const url = URL.createObjectURL(
        new Blob([response.data], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `quiz-report-${resultId}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setPending(false);
    }
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={download}
      className="rounded-lg border border-theme-primary/25 p-2 text-xs font-semibold text-theme-primary dark:text-theme-primary"
    >
      {pending ? "Downloading…" : "Download report"}
    </button>
  );
}
