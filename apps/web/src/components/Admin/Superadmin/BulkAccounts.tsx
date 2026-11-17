"use client";
import { useState } from "react";
import Link from "next/link";
import { bulkAccountsSchema, type BulkAccountResult } from "@buzrr/contract";
import { createBulkAccounts } from "@/app/admin/(privileged)/superadmin/accounts/actions";
import NavbarToggle from "@/components/Admin/NavbarToggle";

export default function BulkAccounts() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkAccountResult[]>([]);
  async function create() {
    const rows = text
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .map((line) => {
        const separator = line.indexOf(";");
        return {
          email: separator < 0 ? line : line.slice(0, separator),
          password: separator < 0 ? "" : line.slice(separator + 1),
        };
      });
    const parsed = bulkAccountsSchema.safeParse(rows);
    if (!parsed.success) {
      setError(
        "Informe de 1 a 100 e-mails válidos e distintos, com senhas de 8 a 128 caracteres. Use e-mail;senha em cada linha.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setResults([]);
    try {
      setResults(await createBulkAccounts(parsed.data));
      setText("");
    } catch {
      setError(
        "Não foi possível concluir. Confira a lista de contas antes de tentar novamente e verifique se o login por senha está ativo.",
      );
    } finally {
      setBusy(false);
    }
  }
  const created = results.filter((row) => row.userId);
  return (
    <div className="w-full space-y-6 p-6 text-theme-text">
      <div className="md:hidden">
        <NavbarToggle />
      </div>
      <h1 className="text-3xl font-bold">Criar contas em massa</h1>
      <p>
        Uma conta por linha, no formato <code>email@email.com;senha</code>. Até
        100 contas por lote. As contas terão o perfil de usuário e poderão criar
        e apresentar quizzes.
      </p>
      <label className="block space-y-2">
        <span>E-mails e senhas (mínimo de 8 caracteres)</span>
        <textarea
          className="w-full rounded border border-theme-border bg-theme-background p-3 font-mono"
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          autoComplete="off"
          spellCheck={false}
          placeholder="equipe01@exemplo.com;SenhaDaConta01"
        />
      </label>
      <p className="text-sm">
        E-mails já cadastrados serão ignorados, sem trocar suas senhas. A lista
        de senhas será limpa ao terminar.
      </p>
      <button
        className="rounded bg-theme-primary px-5 py-3 text-white disabled:opacity-50"
        disabled={busy || !text.trim()}
        onClick={create}
      >
        {busy ? "Criando contas…" : "Criar contas"}
      </button>
      {error && <p role="alert">{error}</p>}
      {results.length > 0 && (
        <div aria-live="polite" className="space-y-3">
          <p>
            {created.length} criada(s) de {results.length} conta(s).
          </p>
          <ul>
            {results.map((row) => (
              <li
                key={row.email}
                className="border-b border-theme-border py-2 break-all"
              >
                {row.email} — {row.userId ? "Criada" : row.error}
              </li>
            ))}
          </ul>
          {created.length > 0 && (
            <Link
              className="inline-block underline"
              href={`/admin/superadmin/import-quiz?users=${encodeURIComponent(created.map((row) => row.userId).join(","))}`}
            >
              Importar quiz nas contas criadas →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
