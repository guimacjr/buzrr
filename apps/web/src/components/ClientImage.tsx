"use client";
import { useBranding } from "@/components/Branding/BrandingProvider";
import clsx from "clsx";
import Image from "next/image";
import { PageTheme } from "@/state/pageThemeSlice";
import { useRenderedTheme } from "@/hooks/useRenderedTheme";

const ClientImage = ({
  props,
}: {
  props: {
    src: string;
    darksrc?: string;
    alt: string;
    width: number;
    height: number;
    classname?: string;
  };
}) => {
  const theme = useRenderedTheme();
  const { branding } = useBranding();
  const customLogo = props.src === "/images/logo.svg" ? branding.logoUrl : null;

  return (
    <>
      <Image
        src={
          customLogo ||
          (theme === PageTheme.light ? props.src : props.darksrc || props.src)
        }
        unoptimized={Boolean(customLogo)}
        alt={customLogo ? "Platform logo" : props.alt}
        width={props.width}
        height={props.height}
        className={clsx(
          props.classname,
          "inline",
          customLogo && "object-contain",
        )}
      />
    </>
  );
};

export default ClientImage;
