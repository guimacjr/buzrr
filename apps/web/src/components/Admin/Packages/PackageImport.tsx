"use client";

import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@mui/material";
import { LuPackageOpen } from "react-icons/lu";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import {
  PACKAGE_MAX_BYTES,
  type AppearanceImportOptions,
  type PackagePreview,
} from "@buzrr/contract";
import { previewPackage, importPackage } from "@/lib/modules/packages/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/modules/query-keys";
import {
  BRANDING_QUERY_KEY,
  useBranding,
} from "@/components/Branding/BrandingProvider";
import { usePlanLimitPrompt } from "@/components/Billing/UpgradePrompt";
import ActionCard from "../Home/ActionCard";

export const packageButtonClass =
  "rounded-lg border border-theme-border px-4 py-2 text-sm font-semibold text-theme-text hover:bg-theme-card disabled:opacity-50 disabled:cursor-wait";

export default function PackageImport({
  kind,
  view,
}: {
  kind: "quiz" | "appearance";
  view?: "grid" | "list";
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PackagePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [options, setOptions] = useState<AppearanceImportOptions>({
    colors: true,
    logo: true,
    avatars: "replace",
  });
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const router = useRouter();
  const cache = useQueryClient();
  const { setPreview: setBrandingPreview } = useBranding();
  const { handlePlanLimit, upgradePrompt } = usePlanLimitPrompt();
  function close() {
    if (lock.current) return;
    setOpen(false);
    setFile(null);
    setPreview(null);
    setError("");
    setProgress(null);
  }
  async function choose(next?: File) {
    if (!next || lock.current) return;
    setPreview(null);
    setFile(null);
    setError("");
    setProgress(null);
    if (
      !next.name.toLowerCase().endsWith(".zip") ||
      next.size > PACKAGE_MAX_BYTES
    ) {
      setError("Escolha um arquivo .buzrr.zip de até 100 MB.");
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      setPreview(await previewPackage(kind, next));
      setFile(next);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function apply() {
    if (!file || !preview || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setProgress(0);
    try {
      const result = await importPackage(kind, file, options, setProgress);
      if (kind === "quiz") {
        await Promise.all([
          cache.invalidateQueries({ queryKey: queryKeys.quizzes.all }),
          cache.invalidateQueries({ queryKey: queryKeys.billing.me }),
        ]);
        toast.success("Quiz importado como uma cópia privada.");
        if (result.quizId) router.push(`/admin/quiz/${result.quizId}`);
      } else {
        setBrandingPreview(null);
        await Promise.all([
          cache.invalidateQueries({ queryKey: BRANDING_QUERY_KEY }),
          cache.invalidateQueries({ queryKey: ["avatars"] }),
        ]);
        toast.success("Personalização importada.");
      }
      lock.current = false;
      close();
    } catch (err) {
      if (!handlePlanLimit(err)) setError(getApiErrorMessage(err));
    } finally {
      lock.current = false;
      setBusy(false);
      setProgress(null);
    }
  }
  const label =
    kind === "quiz" ? "Importar quiz ZIP" : "Importar personalização";
  return (
    <>
      {view ? (
        <ActionCard
          view={view}
          icon={<LuPackageOpen />}
          title={label}
          subtitle="Perguntas e mídias em um arquivo"
          onClick={() => setOpen(true)}
        />
      ) : (
        <button
          type="button"
          className={packageButtonClass}
          onClick={() => setOpen(true)}
        >
          {label}
        </button>
      )}
      <Dialog
        open={open}
        onClose={close}
        fullWidth
        maxWidth="sm"
        aria-labelledby={`package-title-${kind}`}
      >
        <div className="bg-theme-surface text-theme-text">
          <DialogTitle id={`package-title-${kind}`}>{label}</DialogTitle>
          <DialogContent>
            <p className="mb-4 text-sm text-theme-muted">
              {kind === "quiz"
                ? "Cria uma cópia privada com perguntas, configurações e mídias. Partidas e relatórios não são importados."
                : "Transfira as cores, o logo e os avatares entre instalações. Escolha o que aplicar após validar o arquivo."}
            </p>
            <input
              ref={input}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              aria-label="Pacote Buzrr"
              disabled={busy}
              onChange={(e) => {
                void choose(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void choose(e.dataTransfer.files[0]);
              }}
              className="w-full rounded-xl border-2 border-dashed border-theme-border p-6 text-center text-sm disabled:opacity-50"
            >
              {file?.name ?? "Arraste um .buzrr.zip ou clique para escolher"}
              <span className="mt-1 block text-xs text-theme-muted">
                Até 100 MB por pacote · 50 MB por mídia
              </span>
            </button>
            {busy && (
              <p role="status" className="mt-3 text-sm">
                {progress === null
                  ? "Validando pacote…"
                  : progress < 100
                    ? `Enviando: ${progress}%`
                    : "Aplicando conteúdo e mídias…"}
              </p>
            )}
            {error && (
              <p role="alert" className="mt-3 text-sm text-theme-danger">
                {error}
              </p>
            )}
            {preview && (
              <div className="mt-4 space-y-3 rounded-xl bg-theme-card p-4 text-sm">
                {preview.kind === "quiz" ? (
                  <>
                    <p className="font-bold">{preview.title}</p>
                    <p>{preview.questionCount} perguntas</p>
                  </>
                ) : (
                  <>
                    <p>
                      {preview.avatarCount} avatares · Modo:{" "}
                      {preview.avatarMode === "colors" ? "cores" : "imagens"} ·{" "}
                      {preview.hasLogo ? "Logo personalizado" : "Logo padrão"}
                    </p>
                    <div className="flex gap-4">
                      {(["light", "dark"] as const).map((mode) => (
                        <div key={mode}>
                          <p className="mb-1">
                            {mode === "light" ? "Tema claro" : "Tema escuro"}
                          </p>
                          <div className="flex gap-1">
                            {[
                              "primary",
                              "background",
                              "surface",
                              "text",
                              "accent",
                            ].map((key) => (
                              <span
                                key={key}
                                title={key}
                                className="h-6 w-6 rounded border border-theme-border"
                                style={{
                                  background:
                                    preview.colors[mode][
                                      key as keyof typeof preview.colors.light
                                    ],
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={options.colors}
                        onChange={(e) =>
                          setOptions({ ...options, colors: e.target.checked })
                        }
                      />
                      Aplicar cores
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={options.logo}
                        onChange={(e) =>
                          setOptions({ ...options, logo: e.target.checked })
                        }
                      />
                      {preview.hasLogo
                        ? "Aplicar logo"
                        : "Restaurar logo padrão"}
                    </label>
                    <label className="block">
                      Avatares
                      <select
                        disabled={busy}
                        value={options.avatars}
                        onChange={(e) =>
                          setOptions({
                            ...options,
                            avatars: e.target
                              .value as AppearanceImportOptions["avatars"],
                          })
                        }
                        className="mt-1 block w-full rounded border border-theme-border bg-theme-surface p-2"
                      >
                        <option value="replace">
                          Substituir catálogo e modo de seleção
                        </option>
                        <option value="add">Adicionar ao catálogo atual</option>
                        <option value="skip">Manter catálogo atual</option>
                      </select>
                    </label>
                    <p className="text-xs text-theme-muted">
                      {options.avatars === "replace"
                        ? "Substitui as opções disponíveis para novos participantes. Imagens usadas em partidas anteriores são preservadas."
                        : options.avatars === "add"
                          ? "Mantém o modo, o avatar inicial e as opções atuais. Avatares personalizados serão adicionados como novas opções."
                          : "As opções de avatares não serão alteradas."}
                    </p>
                  </>
                )}
                <p className="text-theme-muted">
                  {preview.mediaCount} arquivos de mídia ·{" "}
                  {(preview.mediaBytes / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                className={packageButtonClass}
                onClick={close}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  busy ||
                  !preview ||
                  (kind === "appearance" &&
                    !options.colors &&
                    !options.logo &&
                    options.avatars === "skip")
                }
                className={packageButtonClass}
                onClick={() => void apply()}
              >
                {kind === "quiz" ? "Criar cópia" : "Aplicar personalização"}
              </button>
            </div>
          </DialogContent>
        </div>
      </Dialog>
      {upgradePrompt}
    </>
  );
}
