"use client";
import { useCurrentRole } from "@/components/SessionProvider";
import PackageImport from "./PackageImport";
import PackageExport from "./PackageExport";

export default function AppearancePackages() {
  const role = useCurrentRole();
  if (role !== "admin" && role !== "superadmin") return null;
  return (
    <section className="rounded-xl bg-theme-surface dark:bg-theme-card p-6 text-theme-text">
      <h2 className="text-lg font-black">Transferir personalização</h2>
      <p className="mt-1 text-sm text-theme-muted">
        Exporte as cores, o logo e os avatares salvos, ou aplique um pacote de
        outra instalação.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <PackageExport />
        <PackageImport kind="appearance" />
      </div>
    </section>
  );
}
