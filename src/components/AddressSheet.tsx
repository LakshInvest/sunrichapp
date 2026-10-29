import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const MapPreview = lazy(() => import("@/components/MapPreview"));

export type AddressInfo = {
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city?: string | null;
  pincode?: string | null;
  lat: number | null;
  lng: number | null;
};

/** Bottom sheet showing the customer's registered delivery address and map preview. */
export function AddressSheet({
  open,
  onOpenChange,
  address,
  typeLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: AddressInfo | null;
  typeLabel: string;
}) {
  const { t } = useTranslation();
  const lines = address
    ? [address.line1, address.line2, address.landmark, address.city, address.pincode].filter(Boolean)
    : [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle>{t("account.deliveryAddressTitle")}</DrawerTitle>
          <DrawerDescription className="sr-only">{t("account.deliveryAddress")}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-8">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary/15">
                <MapPin className="h-4 w-4 text-secondary" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-foreground">{typeLabel || t("account.deliveryAddress")}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              {lines.join(", ") || "—"}
            </p>
            {address?.lat != null && address?.lng != null && (
              <div className="mt-3">
                <Suspense fallback={<div className="h-36 w-full animate-pulse rounded-xl bg-muted" />}>
                  <MapPreview lat={address.lat} lng={address.lng} />
                </Suspense>
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t("account.moreAddresses")}</p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
