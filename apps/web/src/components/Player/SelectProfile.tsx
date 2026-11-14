"use client";

import { useAvatars } from "@/lib/modules/avatars/hooks";
import clsx from "clsx";
import Image from "next/image";
import { LuCheck, LuShuffle } from "react-icons/lu";
import { joinLabelClass } from "@/components/Player/Setup/JoinShell";

export default function SelectProfile(props: {
  data: {
    name: string;
    image: string;
  };
  setData: (data: { name: string; image: string }) => void;
}) {
  const query = useAvatars();
  const avatars = query.data?.avatars ?? [];
  const selected = Math.max(
    0,
    avatars.findIndex((a) => a.url === props.data.image),
  );

  function pick(index: number) {
    const avatar = avatars[index];
    if (avatar) props.setData({ ...props.data, image: avatar.url });
  }

  function shuffle() {
    const offset = 1 + Math.floor(Math.random() * (avatars.length - 1));
    pick((selected + offset) % avatars.length);
  }

  if (query.data?.mode === "colors")
    return (
      <p className="text-sm text-theme-muted">
        Sua cor de avatar é atribuída automaticamente.
      </p>
    );

  return (
    <div>
      <div className={joinLabelClass}>
        Escolha um avatar
        <button
          type="button"
          onClick={shuffle}
          disabled={avatars.length < 2}
          className="flex items-center gap-1.5 rounded-[9px] px-[11px] py-1.5 text-[12.5px] font-semibold bg-theme-primary/8 dark:bg-theme-surface/5 hover:bg-theme-primary/15 dark:hover:bg-theme-surface/10 transition-colors cursor-pointer"
        >
          <LuShuffle size={14} />
          Sortear
        </button>
      </div>
      {query.isPending && <p>Carregando avatares…</p>}
      {query.isError && (
        <p role="alert">
          Não foi possível carregar os avatares.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => query.refetch()}
          >
            Tentar novamente
          </button>
        </p>
      )}
      <div
        role="radiogroup"
        aria-label="Avatar"
        className="mt-2.5 grid grid-cols-4 sm:grid-cols-6 gap-2.5 md:gap-3"
      >
        {avatars.map((avatar, index) => {
          const src = avatar.url;
          const on = index === selected;
          return (
            <button
              key={src}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={avatar.label}
              onClick={() => pick(index)}
              className={clsx(
                "relative aspect-square rounded-full border-[3px] transition-[transform,border-color,box-shadow] duration-150 hover:-translate-y-0.5 cursor-pointer",
                on
                  ? "border-theme-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-theme-primary)_18%,transparent)]"
                  : "border-transparent",
              )}
            >
              <Image
                unoptimized
                src={src}
                width={96}
                height={96}
                alt=""
                className="size-full rounded-full object-cover"
              />
              {on && (
                <span className="absolute -right-0.5 -bottom-0.5 size-[26px] rounded-full bg-theme-primary text-theme-onPrimary flex items-center justify-center border-[3px] border-theme-border dark:border-theme-border">
                  <LuCheck size={13} strokeWidth={3.2} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
