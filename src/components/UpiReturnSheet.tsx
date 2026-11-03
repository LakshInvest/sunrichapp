import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SheetDrawer } from "@/components/SheetDrawer";
import { onAppReturn, takeUpiReturn } from "@/lib/upi";

/** After the customer comes back from a UPI app: "Payment done?" → enter UTR / screenshot. */
export function UpiReturnSheet({ onYes }: { onYes: (orderId: string) => void }) {
  const { t } = useTranslation();
  const [orderId, setOrderId] = useState<string | null>(null);
  useEffect(
    () =>
      onAppReturn(() => {
        const id = takeUpiReturn();
        if (id) setOrderId(id);
      }),
    [],
  );
  return (
    <SheetDrawer open={orderId != null} onOpenChange={(o) => !o && setOrderId(null)}>
      <div className="px-5 pb-8 pt-2 text-center">
        <h2 className="text-lg font-bold text-foreground">{t("upi.returnTitle")}</h2>
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={() => {
              const id = orderId;
              setOrderId(null);
              if (id) onYes(id);
            }}
            className="min-h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground"
          >
            {t("upi.returnYes")}
          </button>
          <button type="button" onClick={() => setOrderId(null)} className="min-h-12 w-full rounded-xl border border-border font-semibold">
            {t("upi.returnNo")}
          </button>
        </div>
      </div>
    </SheetDrawer>
  );
}
