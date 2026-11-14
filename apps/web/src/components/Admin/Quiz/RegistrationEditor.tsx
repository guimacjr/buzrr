"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  registrationFieldsSchema,
  type RegistrationField,
} from "@buzrr/contract";
import { toast } from "react-toastify";
import { getAuthApiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";
import { queryKeys } from "@/lib/modules/query-keys";

export default function RegistrationEditor({
  quizId,
  initialFields,
}: {
  quizId: string;
  initialFields: unknown;
}) {
  const [fields, setFields] = useState<RegistrationField[]>(() =>
    registrationFieldsSchema.parse(initialFields ?? []),
  );
  const [saving, setSaving] = useState(false);
  const cache = useQueryClient();
  const inputClass =
    "w-full rounded-lg border border-theme-primary/20 bg-theme-background dark:bg-theme-card p-2 text-sm";
  function change(id: string, patch: Partial<RegistrationField>) {
    setFields((old) => old.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  async function save() {
    const parsed = registrationFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid fields");
      return;
    }
    setSaving(true);
    try {
      await getAuthApiClient().patch(
        `/quizzes/${encodeURIComponent(quizId)}/registration`,
        { fields: parsed.data },
      );
      await cache.invalidateQueries({
        queryKey: queryKeys.quizzes.detail(quizId),
      });
      toast.success("Entry fields saved. Changes apply to new rooms.");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <details className="rounded-xl border border-theme-primary/20 p-4">
      <summary className="cursor-pointer font-bold">
        Player entry fields ({fields.length})
      </summary>
      <p className="my-3 text-sm">
        Collect details when players enter. Save before opening a new room.
      </p>
      <fieldset disabled={saving} className="flex flex-col gap-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border border-theme-primary/20 p-3 flex flex-col gap-2"
          >
            <label className="text-sm">
              Field {index + 1} label
              <input
                aria-label={`Field ${index + 1} label`}
                className={inputClass}
                value={field.label}
                maxLength={150}
                onChange={(e) => change(field.id, { label: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Type
              <select
                className={inputClass}
                value={field.type}
                onChange={(e) =>
                  change(field.id, {
                    type: e.target.value as RegistrationField["type"],
                  })
                }
              >
                <option value="text">Text</option>
                <option value="alphanumeric">Alphanumeric</option>
                <option value="checkbox">Checkbox</option>
                <option value="dropdown">Dropdown list</option>
              </select>
            </label>
            {field.type === "dropdown" && (
              <label className="text-sm">
                Options (one per line)
                <textarea
                  className={inputClass}
                  value={field.options.join("\n")}
                  rows={4}
                  onChange={(e) =>
                    change(field.id, { options: e.target.value.split("\n") })
                  }
                />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) =>
                  change(field.id, { required: e.target.checked })
                }
              />{" "}
              Required
            </label>
            {field.type === "checkbox" && field.required && (
              <small>Players must check this box to enter.</small>
            )}
            <button
              type="button"
              className="text-sm underline text-left"
              onClick={() =>
                setFields((old) => old.filter((f) => f.id !== field.id))
              }
            >
              Remove field
            </button>
          </div>
        ))}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={fields.length >= 30}
            className="rounded-lg border p-2 text-sm"
            onClick={() =>
              setFields((old) => [
                ...old,
                {
                  id: Array.from(
                    crypto.getRandomValues(new Uint32Array(4)),
                    (n) => n.toString(16),
                  ).join("-"),
                  label: "",
                  type: "text",
                  required: false,
                  options: [],
                },
              ])
            }
          >
            Add field
          </button>
          <button
            type="button"
            className="rounded-lg bg-theme-primary text-theme-onPrimary p-2 text-sm"
            onClick={save}
          >
            {saving ? "Saving…" : "Save entry fields"}
          </button>
        </div>
      </fieldset>
    </details>
  );
}
