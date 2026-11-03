import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SheetDrawer } from "@/components/SheetDrawer";
import { DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { getUpiDiagnostic } from "@/lib/upi";
import { APP_VERSION } from "@/lib/version";

/** Deliberately undiscoverable during normal Account use. */
export function UpiDiagnostic() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof getUpiDiagnostic>> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => cancel, []);
  const start = () => {
    cancel();
    timer.current = setTimeout(() => {
      setOpen(true);
      setData(null);
      void getUpiDiagnostic().then(setData);
    }, 2000);
  };
  const text = data ? [
    `${t("upi.diagnosticNative")}: ${data.isNativePlatform}`,
    `${t("upi.diagnosticPlatform")}: ${data.platform}`,
    `${t("upi.diagnosticPlugin")}: ${data.pluginAvailable}`,
    `${t("upi.diagnosticApps")}: ${data.apps}`,
    `${t("upi.diagnosticUrl")}: ${data.url}`,
    `${t("upi.diagnosticError")}: ${data.error}`,
  ].join("\n") : t("common.loading");
  return <>
    <Button variant="ghost" className="mx-auto flex min-h-11 select-none text-xs font-normal text-muted-foreground hover:bg-transparent"
      onPointerDown={start} onPointerUp={cancel} onPointerCancel={cancel} onPointerLeave={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (!e.repeat && (e.key === " " || e.key === "Enter")) start(); }}
      onKeyUp={cancel} onBlur={cancel}>
      {t("account.aboutVersion", { version: APP_VERSION })}
    </Button>
    <SheetDrawer open={open} onOpenChange={setOpen}>
      <DrawerHeader><DrawerTitle>{t("upi.diagnosticTitle")}</DrawerTitle></DrawerHeader>
      <div className="px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-muted p-3 font-mono text-xs text-foreground">{text}</pre>
        <Button className="mt-3 min-h-11 w-full" disabled={!data} onClick={() => {
          void navigator.clipboard.writeText(text).then(() => toast.success(t("success.copied")), () => toast.error(t("inbox.copyFailed")));
        }}><Copy aria-hidden />{t("success.copy")}</Button>
      </div>
    </SheetDrawer>
  </>;
}