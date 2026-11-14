"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  RegistrationAnswers,
  RegistrationField,
  RegistrationSettings,
} from "@buzrr/contract";
import { getPublicApiClient } from "@/lib/api/client";
import { joinInputClass } from "./JoinShell";

export function useRegistrationFields(code?: string) {
  return useQuery({
    queryKey: ["room-registration", code],
    enabled: Boolean(code && code.length === 6),
    retry: false,
    queryFn: async () =>
      (
        await getPublicApiClient().get<RegistrationSettings>(
          `/game-sessions/registration/${encodeURIComponent(code!)}`,
        )
      ).data,
  });
}
export default function RegistrationFields({
  fields,
  answers,
  onChange,
}: {
  fields: RegistrationField[];
  answers: RegistrationAnswers;
  onChange: (answers: RegistrationAnswers) => void;
}) {
  if (!fields.length) return null;
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 font-bold">Dados do participante</legend>
      {fields.map((field) => (
        <label key={field.id} className="flex flex-col gap-2 text-sm">
          <span>
            {field.label}
            {field.required ? " *" : " (opcional)"}
          </span>
          {field.type === "checkbox" ? (
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                required={field.required}
                checked={answers[field.id] === true}
                onChange={(e) =>
                  onChange({ ...answers, [field.id]: e.target.checked })
                }
              />{" "}
              Sim
            </span>
          ) : field.type === "dropdown" ? (
            <select
              className={joinInputClass}
              required={field.required}
              value={String(answers[field.id] ?? "")}
              onChange={(e) =>
                onChange({ ...answers, [field.id]: e.target.value })
              }
            >
              <option value="">Selecione uma opção</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={joinInputClass}
              type="text"
              maxLength={2000}
              required={field.required}
              value={String(answers[field.id] ?? "")}
              onChange={(e) =>
                onChange({ ...answers, [field.id]: e.target.value })
              }
              aria-describedby={
                field.type === "alphanumeric" ? `hint-${field.id}` : undefined
              }
            />
          )}
          {field.type === "alphanumeric" && (
            <small id={`hint-${field.id}`}>
              Use apenas letras e números, sem espaços ou símbolos.
            </small>
          )}
        </label>
      ))}
    </fieldset>
  );
}

/** Translate known validation messages without changing user-authored labels. */
export function registrationErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Dados de entrada inválidos";
  const messages: Record<string, string> = {
    ": required": ": campo obrigatório",
    ": expected a checkbox": ": marque ou desmarque a opção",
    ": expected text": ": informe um texto",
    ": use letters and numbers only": ": use apenas letras e números",
    ": choose one of the listed options": ": selecione uma das opções da lista",
  };
  for (const [suffix, translated] of Object.entries(messages)) {
    if (error.message.endsWith(suffix))
      return error.message.slice(0, -suffix.length) + translated;
  }
  return "Dados de entrada inválidos. Confira os campos e tente novamente.";
}
