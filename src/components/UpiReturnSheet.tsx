import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { getLastUpiLaunch, onAppReturn, onUpiOutcome, openUpi, takeUpiReturn, type UpiResponse } from "@/lib/upi";

export type UpiPrefill = { utr?: string | null; upiResponse?: UpiResponse | null };

/**
 * After the customer comes back from a UPI app.
 * APK + plugin: SUCCESS with UTR → proof sheet prefilled; FAILED → "Payment nahi hua" with retry;
 * no reply → the normal "Payment done?" prompt. Web / old APK: the prompt on return.
 * Never marks anything paid — the proof goes to finance as pending.
 */
export function UpiReturnSheet({ onYes }: { onYes: (orderId: string, upi?: UpiPrefill) => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<{ orderId: string; mode: "ask" | "failed"; response: UpiResponse | null } | null>(null);
  useEffect(
    () =>
      onAppReturn(() => {
        const id = takeUpiReturn();
        if (id) setState({ orderId: id, mode: "ask", response: null });
      }),
    [],
  );
  useEffect(
    () =>
      onUpiOutcome((orderId, o) => {
        if (!orderId) return;
        if (o.kind === "success") {
          setState(null);
          onYes(orderId, { utr: o.response.utr, upiResponse: o.response });
        } else if (o.kind === "failed") setState({ orderId, mode: "failed", response: o.response });
        else if (o.kind === "none") setState({ orderId, mode: "ask", response: o.response });
      }),
    [onYes],
  );

  const yes = () => {
    const s = state;
    setState(null);
    if (s) onYes(s.orderId, { upiResponse: s.response });
  };
  const retry = async () => {
    const last = getLastUpiLaunch();
    setState(null);
    if (!last) return;
    const res = await openUpi(last.params, last.app, last.orderId);
    if (res.kind === "noApp") toast.error(t("upi.noApp"));
  };

  return (
    <SheetDrawer open={state != null} onOpenChange={(o) => !o && setState(null)}>
      <div className="px-5 pb-8 pt-2 text-center">
        {state?.mode === "failed" ? (
          <>
            <XCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden />
            <h2 className="mt-2 text-lg font-bold text-foreground">{t("upi.failedTitle")}</h2>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={() => void retry()} className="min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">
                {t("upi.retry")}
              </button>
              <button type="button" onClick={yes} className="min-h-12 w-full rounded-xl border border-border font-semibold">
                {t("upi.paidAnyway")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground">{t("upi.returnTitle")}</h2>
            <div className="mt-5 space-y-2">
              <button type="button" onClick={yes} className="min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">
                {t("upi.returnYes")}
              </button>
              <button type="button" onClick={() => setState(null)} className="min-h-12 w-full rounded-xl border border-border font-semibold">
                {t("upi.returnNo")}
              </button>
            </div>
          </>
        )}
      </div>
    </SheetDrawer>
  );
}
