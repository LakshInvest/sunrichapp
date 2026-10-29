import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { LANGUAGES, type Lang } from "@/lib/i18n";

const LANGUAGE_LABELS: Record<Lang, string> = { en: "English", hi: "हिंदी", mr: "मराठी" };

/** Bottom sheet for picking the app language. */
export function LanguageSheet({
  open,
  onOpenChange,
  lang,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Lang;
  onChoose: (lang: Lang) => void;
}) {
  const { t } = useTranslation();
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <DrawerHeader>
          <DrawerTitle>{t("account.language")}</DrawerTitle>
        </DrawerHeader>
        <div className="flex gap-2 px-4 pb-10">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              onClick={() => {
                onChoose(l);
                onOpenChange(false);
              }}
              aria-pressed={lang === l}
              className={`min-h-14 flex-1 rounded-xl border-2 text-base font-semibold transition active:scale-[0.98] ${
                lang === l
                  ? "border-secondary bg-secondary/10 text-primary"
                  : "border-border bg-background text-foreground"
              }`}
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
