import { useTranslation } from "react-i18next";
import { localSlot, useAppSettings } from "@/lib/app-settings";

/** Order slot in the current language (name_hi / name_mr from Command Center). */
export function SlotText({ value }: { value: string | null }) {
  const { i18n } = useTranslation();
  const settings = useAppSettings();
  if (!value) return null;
  return <> · {localSlot(value, settings?.slots, i18n.language)}</>;
}
