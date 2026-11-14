"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  brandingCss,
  brandingSchema,
  DEFAULT_BRANDING,
  type Branding,
  type ThemeSettings,
} from "@buzrr/contract";
import { getPublicApiClient } from "@/lib/api/client";

const BrandingContext = createContext<{
  branding: Branding;
  loading: boolean;
  error: boolean;
  preview: ThemeSettings | null;
  setPreview: (value: ThemeSettings | null) => void;
}>({
  branding: DEFAULT_BRANDING,
  loading: true,
  error: false,
  preview: null,
  setPreview: () => undefined,
});
export const BRANDING_QUERY_KEY = ["branding"] as const;
export function useBranding() {
  return useContext(BrandingContext);
}
export default function BrandingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [preview, setPreview] = useState<ThemeSettings | null>(null);
  const query = useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: async () =>
      brandingSchema.parse((await getPublicApiClient().get("/branding")).data),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const branding = query.data ?? DEFAULT_BRANDING;
  return (
    <BrandingContext.Provider
      value={{
        branding,
        loading: query.isPending,
        error: query.isError,
        preview,
        setPreview,
      }}
    >
      <style data-platform-branding>{brandingCss(preview ?? branding)}</style>
      {children}
    </BrandingContext.Provider>
  );
}
