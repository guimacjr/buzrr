"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  PACKAGE_MAX_BYTES,
  type BulkQuizResult,
  type PackagePreview,
} from "@buzrr/contract";
import { listBulkUsers, distributeQuiz } from "@/lib/modules/admin-users/api";
import { previewPackage } from "@/lib/modules/packages/api";
import { getApiErrorMessage } from "@/lib/api/errors";
import NavbarToggle from "@/components/Admin/NavbarToggle";

export default function BulkQuizImport({
  initialIds,
}: {
  initialIds: string[];
}) {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [selected, setSelected] = useState(() => new Set(initialIds));
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<PackagePreview>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkQuizResult[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const users = useQuery({
    queryKey: ["bulk-users", search, cursor],
    queryFn: () => listBulkUsers(search, cursor),
  });
  async function inspect(next?: File) {
    setFile(undefined);
    setPreview(undefined);
    setResults([]);
    setError("");
    if (!next) return;
    if (next.size > PACKAGE_MAX_BYTES) {
      setError(
        `O limite do ZIP é ${Math.round(PACKAGE_MAX_BYTES / 1024 / 1024)} MB.`,
      );
      return;
    }
    setBusy(true);
    try {
      setPreview(await previewPackage("quiz", next));
      setFile(next);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function run() {
    if (!file) return;
    setBusy(true);
    setError("");
    setResults([]);
    try {
      const rows = await distributeQuiz(file, [...selected]);
      setResults(rows);
      setSelected(
        new Set(rows.filter((row) => !row.quizId).map((row) => row.userId)),
      );
    } catch (e) {
      setError(
        `${getApiErrorMessage(e)} Confira as contas antes de repetir: algumas cópias podem ter sido criadas.`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="w-full space-y-6 p-6 text-theme-text">
      <div className="md:hidden">
        <NavbarToggle />
      </div>
      <h1 className="text-3xl font-bold">Distribuir quiz</h1>
      <p>
        Envie um <strong>.buzrr.zip</strong> exportado pelo Buzrr. Cada conta
        selecionada receberá uma cópia privada independente, com perguntas,
        mídias e configurações.
      </p>
      <Link href="/admin/superadmin/accounts" className="underline">
        Criar contas em massa
      </Link>
      <label className="block space-y-2">
        <span>Pacote do quiz</span>
        <input
          className="block w-full rounded border border-theme-border p-3"
          type="file"
          accept=".zip"
          disabled={busy}
          onChange={(e) => void inspect(e.target.files?.[0])}
        />
      </label>
      {preview?.kind === "quiz" && (
        <div className="rounded border border-theme-border p-4">
          <strong>{preview.title}</strong>
          <p>
            {preview.questionCount} perguntas · {preview.mediaCount} mídias.
            Pacote validado.
          </p>
        </div>
      )}
      <fieldset disabled={busy} className="space-y-3">
        <legend className="mb-3 text-xl font-semibold">
          Contas destinatárias ({selected.size}/100)
        </legend>
        <label className="block">
          Buscar por nome ou e-mail
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(undefined);
            }}
            className="mt-2 block w-full rounded border border-theme-border bg-theme-background p-3"
          />
        </label>
        <div className="flex flex-wrap gap-4">
          <button
            className="underline"
            type="button"
            onClick={() => {
              const next = new Set(selected);
              const names = { ...labels };
              for (const user of users.data?.items ?? []) {
                if (next.size < 100) {
                  next.add(user.id);
                  names[user.id] = user.email;
                }
              }
              setSelected(next);
              setLabels(names);
            }}
          >
            Selecionar esta página
          </button>
          <button
            className="underline"
            type="button"
            onClick={() => setSelected(new Set())}
          >
            Limpar seleção
          </button>
        </div>
        {users.isPending && <p>Carregando contas…</p>}
        {users.isError && (
          <p role="alert">
            Falha ao buscar contas.{" "}
            <button className="underline" onClick={() => void users.refetch()}>
              Tentar novamente
            </button>
          </p>
        )}
        <div className="max-h-80 overflow-y-auto rounded border border-theme-border">
          {users.data?.items.map((user) => (
            <label
              key={user.id}
              className="flex items-center gap-3 border-b border-theme-border p-3 break-all"
            >
              <input
                type="checkbox"
                checked={selected.has(user.id)}
                disabled={!selected.has(user.id) && selected.size >= 100}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(user.id);
                  else next.delete(user.id);
                  setSelected(next);
                  setLabels({ ...labels, [user.id]: user.email });
                }}
              />
              <span>
                {user.email}
                <span className="block text-sm opacity-70">{user.name}</span>
              </span>
            </label>
          ))}
          {users.data?.items.length === 0 && (
            <p className="p-3">Nenhuma conta encontrada.</p>
          )}
        </div>
        <div className="flex gap-4">
          {cursor && (
            <button className="underline" onClick={() => setCursor(undefined)}>
              Primeira página
            </button>
          )}
          {users.data?.nextCursor && (
            <button
              className="underline"
              onClick={() => setCursor(users.data!.nextCursor!)}
            >
              Próxima página
            </button>
          )}
        </div>
        {selected.size > 0 && (
          <details>
            <summary>Revisar contas selecionadas ({selected.size})</summary>
            <ul>
              {[...selected].map((id) => (
                <li className="py-1 break-all" key={id}>
                  {labels[id] ??
                    users.data?.items.find((u) => u.id === id)?.email ??
                    id}{" "}
                  <button
                    className="underline"
                    onClick={() =>
                      setSelected(
                        new Set([...selected].filter((value) => value !== id)),
                      )
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </fieldset>
      <button
        className="rounded bg-theme-primary px-5 py-3 text-white disabled:opacity-50"
        disabled={busy || !file || selected.size === 0}
        onClick={run}
      >
        {busy ? "Processando…" : `Importar em ${selected.size} conta(s)`}
      </button>
      <p className="text-sm">
        Os limites de quizzes de cada conta continuam valendo. Contas concluídas
        saem da seleção; você pode tentar novamente apenas as que falharam. Uma
        nova importação cria outra cópia.
      </p>
      {error && <p role="alert">{error}</p>}
      {results.length > 0 && (
        <div aria-live="polite">
          <p>
            {results.filter((r) => r.quizId).length} de {results.length}{" "}
            importações concluídas.
          </p>
          <ul>
            {results.map((row) => (
              <li
                className="border-b border-theme-border py-2 break-all"
                key={row.userId}
              >
                {labels[row.userId] ??
                  users.data?.items.find((u) => u.id === row.userId)?.email ??
                  row.userId}{" "}
                — {row.quizId ? "Quiz importado" : row.error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
