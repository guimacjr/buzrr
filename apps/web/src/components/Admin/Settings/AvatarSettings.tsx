"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AvatarAction, AvatarCatalog } from "@buzrr/contract";
import { toast } from "react-toastify";
import { useCurrentRole } from "@/components/SessionProvider";
import { getAuthApiClient } from "@/lib/api/client";
import { getApiErrorMessage } from "@/lib/api/errors";

function Manager() {
  const cache = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [results, setResults] = useState<{ name: string; error?: string }[]>(
    [],
  );
  const query = useQuery({
    queryKey: ["avatars", "manage"],
    queryFn: async () =>
      (await getAuthApiClient().get<AvatarCatalog>("/avatars/manage")).data,
  });
  async function changed() {
    await cache.invalidateQueries({ queryKey: ["avatars"] });
  }
  const update = useMutation({
    mutationFn: async (body: AvatarAction) =>
      getAuthApiClient().patch("/avatars", body),
    onSuccess: changed,
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!files.length) throw new Error("Choose at least one image");
      const failed: File[] = [];
      let uploaded = 0;
      setResults([]);
      setProgress({ completed: 0, total: files.length });
      for (const [index, file] of files.entries()) {
        const body = new FormData();
        body.append("file", file);
        const name =
          files.length === 1 && label.trim()
            ? label.trim()
            : file.name
                .replace(/\.[^.]+$/, "")
                .trim()
                .slice(0, 80) || "Avatar";
        body.append("label", name);
        try {
          await getAuthApiClient().post("/avatars", body);
          uploaded++;
          setResults((previous) => [...previous, { name: file.name }]);
        } catch (error) {
          failed.push(file);
          setResults((previous) => [
            ...previous,
            { name: file.name, error: getApiErrorMessage(error) },
          ]);
        }
        setProgress({ completed: index + 1, total: files.length });
      }
      return { failed, uploaded };
    },
    onSuccess: async ({ failed, uploaded }) => {
      setFiles(failed);
      if (!failed.length) setLabel("");
      if (fileInput.current) fileInput.current.value = "";
      await changed();
      if (uploaded) toast.success(`${uploaded} avatar(s) uploaded`);
      if (failed.length)
        toast.error(
          `${failed.length} upload(s) failed. You can retry these files.`,
        );
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const busy = update.isPending || upload.isPending;
  if (query.isPending) return <p>Loading avatars…</p>;
  if (query.isError)
    return (
      <div role="alert">
        Could not load avatars.{" "}
        <button
          type="button"
          onClick={() => query.refetch()}
          className="underline"
        >
          Retry
        </button>
      </div>
    );
  const catalog = query.data;
  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 text-sm">
        Aparência dos participantes
        <select
          value={catalog.mode}
          disabled={busy}
          onChange={(event) =>
            update.mutate({
              action: "mode",
              mode: event.target.value === "colors" ? "colors" : "images",
            })
          }
          className="rounded-lg border p-2 bg-theme-background dark:bg-theme-surface"
        >
          <option value="images">Avatares com imagens</option>
          <option value="colors">Desabilitar imagens — cores aleatórias</option>
        </select>
        <span className="text-theme-muted">
          O modo de cores aleatórias oculta a escolha de imagens e atribui uma
          cor a cada novo participante. As imagens configuradas ficam salvas
          para quando você reativar os avatares.
        </span>
      </label>
      <fieldset
        disabled={busy || catalog.mode === "colors"}
        className="flex flex-col gap-5 disabled:opacity-50"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!busy && files.length) upload.mutate();
          }}
          className="flex flex-wrap gap-3 items-end"
        >
          <label className="flex flex-col gap-1 text-sm">
            Avatar name (optional, single image only)
            <input
              maxLength={80}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="rounded-lg border p-2 bg-theme-background dark:bg-theme-surface"
              disabled={busy || files.length > 1}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Images
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
              onChange={(e) => {
                setFiles(Array.from(e.target.files ?? []));
                if ((e.target.files?.length ?? 0) > 1) setLabel("");
                setResults([]);
                setProgress({ completed: 0, total: 0 });
              }}
              disabled={busy}
            />
          </label>
          <button
            type="submit"
            disabled={busy || !files.length}
            className="rounded-lg bg-theme-primary text-theme-onPrimary p-2 text-sm"
          >
            {upload.isPending
              ? `Uploading ${progress.completed}/${progress.total}…`
              : `Upload avatars (${files.length})`}
          </button>
        </form>
        <p className="text-sm text-theme-muted">
          Select multiple images to upload together. Each avatar uses its
          filename as its name. Keep this page open until the uploads finish.
        </p>
        {progress.total > 0 && (
          <p role="status" className="text-sm">
            {progress.completed} / {progress.total} files processed
          </p>
        )}
        {results.length > 0 && (
          <ul
            className="max-h-48 overflow-y-auto text-sm"
            aria-label="Upload results"
          >
            {results.map((result, index) => (
              <li
                key={index}
                className={
                  result.error ? "text-theme-danger" : "text-theme-success"
                }
              >
                {result.name}:{" "}
                {result.error ? `Failed — ${result.error}` : "Uploaded"}
              </li>
            ))}
          </ul>
        )}
        {!upload.isPending && results.some((result) => result.error) && (
          <p className="text-sm">
            Only failed files remain selected. Click Upload avatars to retry
            them.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={
              busy || !catalog.avatars.some((a) => a.builtin && a.enabled)
            }
            onClick={() =>
              update.mutate({ action: "builtins", enabled: false })
            }
            className="rounded-lg border p-2 text-sm"
          >
            Hide all default avatars
          </button>
          <button
            type="button"
            disabled={
              busy ||
              catalog.avatars.filter((a) => a.builtin).every((a) => a.enabled)
            }
            onClick={() => update.mutate({ action: "builtins", enabled: true })}
            className="rounded-lg border p-2 text-sm"
          >
            Restore default avatars
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {catalog.avatars.map((avatar) => (
            <div
              key={avatar.id}
              className="rounded-xl border border-theme-primary/20 p-3 flex flex-col items-center gap-2"
            >
              <Image
                src={avatar.url}
                width={80}
                height={80}
                alt={avatar.label}
                unoptimized
                className="size-20 rounded-full object-cover"
              />
              <span className="text-sm font-semibold break-all">
                {avatar.label}
              </span>
              <span className="text-xs">
                {avatar.builtin ? "Built-in" : "Custom"}
              </span>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={avatar.enabled}
                  disabled={busy}
                  onChange={(e) =>
                    update.mutate({
                      action: "enabled",
                      id: avatar.id,
                      enabled: e.target.checked,
                    })
                  }
                />{" "}
                Available
              </label>
              <button
                type="button"
                disabled={
                  busy || !avatar.enabled || catalog.defaultId === avatar.id
                }
                onClick={() =>
                  update.mutate({ action: "default", id: avatar.id })
                }
                className="text-xs underline disabled:no-underline"
              >
                {catalog.defaultId === avatar.id
                  ? "Initial avatar"
                  : "Use as initial avatar"}
              </button>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
export default function AvatarSettings() {
  const role = useCurrentRole();
  return (
    <section className="bg-theme-surface dark:bg-theme-card rounded-xl p-6 text-theme-text dark:text-theme-text">
      <h2 className="text-lg font-black">Player avatars</h2>
      <p className="text-xs text-theme-muted dark:text-theme-muted mt-1 mb-4">
        Global choices for all quizzes. Hiding an avatar preserves images in
        existing games and reports. Use random colors to disable image avatars.
      </p>
      {role === "admin" || role === "superadmin" ? (
        <Manager />
      ) : (
        <p className="text-sm">
          An admin or superadmin can manage the global avatar list.
        </p>
      )}
    </section>
  );
}
