import BulkQuizImport from "@/components/Admin/Superadmin/BulkQuizImport";
import { bulkQuizTargetsSchema } from "@buzrr/contract";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ users?: string }>;
}) {
  const params = await searchParams;
  const parsed = bulkQuizTargetsSchema.safeParse(
    typeof params.users === "string" ? params.users.split(",") : [],
  );
  return <BulkQuizImport initialIds={parsed.success ? parsed.data : []} />;
}
