"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { COLOR_AVATARS, type AvatarCatalog } from "@buzrr/contract";
import { getPublicApiClient } from "@/lib/api/client";
import { DEFAULT_AVATAR } from "@/constants";

export function useAvatars() {
  return useQuery({
    queryKey: ["avatars", "public"],
    queryFn: async () =>
      (await getPublicApiClient().get<AvatarCatalog>("/avatars")).data,
    staleTime: 0,
  });
}
export function useAvatarSelection(selected: string) {
  const [color] = useState(
    () => COLOR_AVATARS[Math.floor(Math.random() * COLOR_AVATARS.length)]!.url,
  );
  const query = useAvatars();
  const catalog = query.data;
  if (catalog?.mode === "colors") return color;
  return (
    catalog?.avatars.find((a) => a.url === selected)?.url ??
    catalog?.avatars.find((a) => a.id === catalog.defaultId)?.url ??
    catalog?.avatars[0]?.url ??
    DEFAULT_AVATAR
  );
}
