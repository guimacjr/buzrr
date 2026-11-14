"use client";
import { useState } from "react";
import CheckLocalPlayer from "@/components/Player/CheckLocalPlayer";
import CreatePlayerForm from "@/components/Player/Setup/CreatePlayerForm";
import JoinShell from "@/components/Player/Setup/JoinShell";
import ProfilePreview from "@/components/Player/Setup/ProfilePreview";
import { useAvatarSelection } from "@/lib/modules/avatars/hooks";

function Player() {
  const [data, setData] = useState({
    name: "",
    image: "",
  });

  const selectedImage = useAvatarSelection(data.image);
  const profile = { ...data, image: selectedImage };

  return (
    <>
      <CheckLocalPlayer />
      <JoinShell
        form={<CreatePlayerForm data={profile} setData={setData} />}
        preview={<ProfilePreview name={data.name} image={selectedImage} />}
      />
    </>
  );
}

export default Player;
