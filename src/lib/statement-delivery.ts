import { isNative, openInApp } from "@/lib/native";
import { shareOrDownload } from "@/lib/ledger";

/** Native PDF handoff never navigates the app's WebView. */
export async function deliverStatement(blob: Blob, filename: string, text: string, mode: "download" | "share", upload: (opts: { data: { pdf: string; filename: string } }) => Promise<{ url: string }>): Promise<void> {
  if (isNative()) {
    const pdf = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const { url } = await upload({ data: { pdf, filename } });
    if (mode === "download") await openInApp(url);
    else {
      const { Share } = await import("@capacitor/share");
      await Share.share({ title: text, text, url });
    }
    return;
  }
  if (mode === "share") {
    await shareOrDownload(blob, filename, text);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}