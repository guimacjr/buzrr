"use client";
import { useRef, useState } from "react";
import { LuDownload } from "react-icons/lu";
import { toast } from "react-toastify";
import { downloadPackage } from "@/lib/modules/packages/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { packageButtonClass } from "./PackageImport";

export default function PackageExport({
  quizId,
  title,
  className,
  menuItem = false,
}: {
  quizId?: string;
  title?: string;
  className?: string;
  menuItem?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function download() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await downloadPackage(quizId ? "quiz" : "appearance", quizId, title);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      role={menuItem ? "menuitem" : undefined}
      disabled={busy}
      className={className ?? packageButtonClass}
      onClick={() => void download()}
    >
      <LuDownload className="inline mr-2" />
      {busy
        ? "Preparando ZIP…"
        : quizId
          ? "Exportar ZIP"
          : "Exportar personalização"}
    </button>
  );
}
