export type PreparedFile =
  | { ok: true; blob: Blob; mime: string; ext: string }
  | { ok: false; reason: "tooLarge" | "type" };

const MAX_BYTES = 5 * 1024 * 1024; // hard cap: 5 MB
const TARGET_BYTES = 1.5 * 1024 * 1024; // images compressed to ~1.5 MB

/** Compress images to ~1.5 MB before upload; PDFs pass through (5 MB cap). */
export async function prepareUpload(file: File): Promise<PreparedFile> {
  if (file.type === "application/pdf") {
    return file.size <= MAX_BYTES
      ? { ok: true, blob: file, mime: file.type, ext: "pdf" }
      : { ok: false, reason: "tooLarge" };
  }
  if (!file.type.startsWith("image/")) return { ok: false, reason: "type" };

  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, reason: "type" };
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= TARGET_BYTES) return { ok: true, blob, mime: "image/jpeg", ext: "jpg" };
    if (quality === 0.4 && blob) return { ok: true, blob, mime: "image/jpeg", ext: "jpg" };
  }
  return { ok: false, reason: "type" };
}
