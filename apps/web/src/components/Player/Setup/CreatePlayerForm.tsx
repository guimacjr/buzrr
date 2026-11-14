"use client";

import { useAvatars } from "@/lib/modules/avatars/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import RegistrationFields, {
  useRegistrationFields,
  registrationErrorMessage,
} from "./RegistrationFields";
import {
  validateRegistrationAnswers,
  type RegistrationAnswers,
} from "@buzrr/contract";
import { useEffect, useState } from "react";
import clsx from "clsx";
import SelectProfile from "@/components/Player/SelectProfile";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import "react-toastify/dist/ReactToastify.css";
import { getApiErrorMessage } from "@/lib/api/errors";
import { createPlayerSchema } from "@/lib/modules/forms/schemas";
import { useCreatePlayerMutation } from "@/lib/modules/players/hooks";
import { useJoinRoomMutation } from "@/lib/modules/game-sessions/hooks";
import { clearPlayerLocalSession } from "@/lib/player-session";
import { isAxiosError } from "axios";
import { mutedText, primaryButtonClass } from "@/components/Game/GameUI";
import {
  BackSquare,
  Steps,
  joinCounterClass,
  joinInputClass,
  joinLabelClass,
} from "@/components/Player/Setup/JoinShell";

type FormValues = z.infer<typeof createPlayerSchema>;

const NAME_MAX = 30;

const sanitizeName = (value: string) =>
  value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, NAME_MAX);

const CreatePlayerForm = (props: {
  data: {
    name: string;
    image: string;
  };
  setData: (data: { name: string; image: string }) => void;
  /**
   * When set (link/QR join flow), the player is dropped straight into this
   * room after being created — skipping the manual "enter room code" step.
   */
  joinGameCode?: string;
}) => {
  const router = useRouter();
  const avatars = useAvatars();
  const registration = useRegistrationFields(props.joinGameCode);
  const [answers, setAnswers] = useState<RegistrationAnswers>({});
  const mutation = useCreatePlayerMutation();
  const joinMutation = useJoinRoomMutation();
  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: {
      username: props.data.name,
      profile: props.data.image,
    },
  });

  useEffect(() => {
    reset({
      username: props.data.name,
      profile: props.data.image,
    });
  }, [props.data.name, props.data.image, reset]);

  const handleNameChange = (value: string) => {
    const trimmed = sanitizeName(value);
    props.setData({
      ...props.data,
      name: trimmed,
    });
  };

  // Link/QR flow: after the player exists, join the room the link points at
  // and go straight to the game — no room-code entry step.
  const autoJoin = (
    gameCode: string,
    registrationAnswers: RegistrationAnswers,
  ) => {
    joinMutation.mutate(
      { gameCode, registrationAnswers },
      {
        onSuccess: (joinRes) => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("playerId", joinRes.playerId);
          }
          router.push(`/player/play/${joinRes.playerId}`);
        },
        onError: (err) => {
          if (isAxiosError(err) && err.response?.status === 401) {
            clearPlayerLocalSession();
            toast.error("Sua sessão expirou. Tente novamente.");
            return;
          }
          if (isAxiosError(err) && err.response?.status === 404) {
            toast.error("Este link é inválido ou a partida já terminou.");
            return;
          }
          toast.error(getApiErrorMessage(err));
        },
      },
    );
  };

  const pending =
    !avatars.data ||
    avatars.isError ||
    mutation.isPending ||
    joinMutation.isPending ||
    Boolean(
      props.joinGameCode && (!registration.data || registration.isFetching),
    );

  const onSubmit = handleSubmit((data) => {
    if (pending) return;
    let registrationAnswers: RegistrationAnswers = {};
    try {
      registrationAnswers = validateRegistrationAnswers(
        registration.data?.fields ?? [],
        answers,
      );
    } catch (error) {
      toast.error(registrationErrorMessage(error));
      return;
    }
    mutation.mutate(
      {
        username: data.username,
        profile: data.profile,
      },
      {
        onSuccess: (res) => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("playerToken", res.accessToken);
          }
          if (props.joinGameCode) {
            autoJoin(props.joinGameCode, registrationAnswers);
            return;
          }
          router.push(`/player/joinRoom/${res.playerId}`);
        },
        onError: (err) => {
          toast.error(getApiErrorMessage(err));
        },
      },
    );
  });

  return (
    <form
      className="flex flex-col gap-5 md:gap-6 animate-fade-up"
      onSubmit={onSubmit}
    >
      <div className="flex items-center justify-between">
        <BackSquare href="/" />
        {!props.joinGameCode && <Steps step={1} />}
      </div>
      <div>
        <h1 className="text-[32px] md:text-[44px] font-extrabold tracking-[-0.03em] leading-[1.06]">
          Crie seu perfil
        </h1>
        <p className={clsx("mt-2.5 text-base", mutedText)}>
          {props.joinGameCode ? (
            <>
              Entrando na sala{" "}
              <b className="font-bold tracking-[0.1em] text-theme-primary dark:text-theme-primary">
                {props.joinGameCode}
              </b>
            </>
          ) : (
            <>
              Entrando em um{" "}
              <b className="font-semibold text-theme-text dark:text-theme-text">
                quiz privado
              </b>
            </>
          )}
        </p>
      </div>

      <Controller
        name="username"
        control={control}
        render={({ field, fieldState }) => (
          <label className="block">
            <span className={joinLabelClass}>
              Nome de exibição
              <span className={joinCounterClass}>
                {field.value.length}/{NAME_MAX}
              </span>
            </span>
            <input
              type="text"
              id="displayName"
              name={field.name}
              placeholder="Digite seu nome de exibição"
              className={clsx(joinInputClass, "mt-2")}
              required
              autoComplete="off"
              maxLength={NAME_MAX}
              value={field.value}
              onBlur={field.onBlur}
              ref={field.ref}
              aria-invalid={!!fieldState.error}
              onChange={(e) => {
                handleNameChange(e.target.value);
                field.onChange(sanitizeName(e.target.value));
              }}
            />
            {fieldState.error?.message ? (
              <span className="mt-1.5 block text-sm text-theme-danger dark:text-theme-danger">
                {fieldState.error.message}
              </span>
            ) : (
              <span className={clsx("mt-1.5 block", joinCounterClass)}>
                Use apenas letras, números e sublinhados.
              </span>
            )}
          </label>
        )}
      />

      <SelectProfile {...props} />
      {registration.data && (
        <RegistrationFields
          fields={registration.data.fields}
          answers={answers}
          onChange={setAnswers}
        />
      )}
      {props.joinGameCode && registration.isError && (
        <p role="alert">
          Não foi possível carregar a sala. Confira o link ou use o código da
          sala.
        </p>
      )}

      <button
        type="submit"
        disabled={!props.data.name.trim() || pending}
        className={clsx(primaryButtonClass, "w-full py-4 text-[17px]")}
      >
        {pending
          ? "Carregando…"
          : props.joinGameCode
            ? "Entrar na partida"
            : "Avançar"}
      </button>
    </form>
  );
};

export default CreatePlayerForm;
