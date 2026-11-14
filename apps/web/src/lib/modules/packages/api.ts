import axios from "axios";
import {
  packagePreviewSchema,
  type AppearanceImportOptions,
  type PackageImportResult,
} from "@buzrr/contract";
import { getAuthApiClient } from "@/lib/api/client";

const endpoint = (kind: "quiz" | "appearance") =>
  `/packages/${kind === "quiz" ? "quizzes" : "appearance"}`;
export async function previewPackage(kind: "quiz" | "appearance", file: File) {
  const body = new FormData();
  body.append("file", file);
  return packagePreviewSchema.parse(
    (await getAuthApiClient().post(`${endpoint(kind)}/preview`, body)).data,
  );
}
export async function importPackage(
  kind: "quiz" | "appearance",
  file: File,
  options: AppearanceImportOptions,
  onProgress: (value: number) => void,
) {
  const body = new FormData();
  body.append("file", file);
  if (kind === "appearance") body.append("options", JSON.stringify(options));
  return (
    await getAuthApiClient().post<PackageImportResult>(
      `${endpoint(kind)}/import`,
      body,
      {
        onUploadProgress: (event) => {
          if (event.total)
            onProgress(Math.round((event.loaded / event.total) * 100));
        },
      },
    )
  ).data;
}
export async function downloadPackage(
  kind: "quiz" | "appearance",
  quizId?: string,
  title?: string,
) {
  try {
    const response = await getAuthApiClient().get<Blob>(
      `${endpoint(kind)}${quizId ? `/${encodeURIComponent(quizId)}` : ""}`,
      { responseType: "blob" },
    );
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title || (kind === "quiz" ? "quiz" : "personalizacao")).replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 80)}.buzrr.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      try {
        error.response.data = JSON.parse(await error.response.data.text());
      } catch {
        /* Keep the HTTP error when the response is not JSON. */
      }
    }
    throw error;
  }
}
