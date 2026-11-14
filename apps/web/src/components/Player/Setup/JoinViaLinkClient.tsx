"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CreatePlayerForm from "@/components/Player/Setup/CreatePlayerForm";
import ResetReduxStates from "@/components/Player/ResetReduxStates";
import clsx from "clsx";
import JoinShell from "@/components/Player/Setup/JoinShell";
import ProfilePreview from "@/components/Player/Setup/ProfilePreview";
import { useAvatarSelection } from "@/lib/modules/avatars/hooks";
import { mutedText } from "@/components/Game/GameUI";

/**
 * Link/QR entry point. The room code is carried by the URL, so the player only
 * enters a name and is joined straight into the game (no room-code step). A
 * manual-join fallback stays available for invalid/expired links.
 */
export default function JoinViaLinkClient({ gameCode }: { gameCode: string }) {
  // Codes are uppercase, whitespace-free (see JoinRoomForm) — normalize the
  // raw URL segment so a typed/lower-cased link still resolves.
  const normalizedCode = useMemo(
    () => gameCode.replace(/\s/g, "").toUpperCase(),
    [gameCode],
  );

  const [data, setData] = useState({
    name: "",
    image: "",
  });

  const selectedImage = useAvatarSelection(data.image);
  const profile = { ...data, image: selectedImage };

  return (
    <>
      {/* A link join is always a fresh game — clear any stale room state. */}
      <ResetReduxStates />
      <JoinShell
        form={
          <>
            <CreatePlayerForm
              data={profile}
              setData={setData}
              joinGameCode={normalizedCode}
            />
            <p className={clsx("text-sm", mutedText)}>
              Está com dificuldades?{" "}
              <Link
                href="/player"
                className="font-semibold text-theme-primary dark:text-theme-primary hover:underline"
              >
                Entrar usando o código da sala
              </Link>
            </p>
          </>
        }
        preview={<ProfilePreview name={data.name} image={selectedImage} />}
      />
    </>
  );
}
