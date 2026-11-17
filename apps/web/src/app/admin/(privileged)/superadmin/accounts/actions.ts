"use server";

import { headers } from "next/headers";
import { provisionBulkAccounts } from "@/lib/auth";

export async function createBulkAccounts(input: unknown) {
  return provisionBulkAccounts(input, await headers());
}
