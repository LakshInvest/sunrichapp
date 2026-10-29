import { useTranslation } from "react-i18next";

export function Logo({ size = "lg" }: { size?: "md" | "lg" }) {
  const { t } = useTranslation();
  const big = size === "lg";
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 24 32" className={big ? "h-10 w-8" : "h-7 w-5"} aria-hidden>
        <path d="M12 1C12 1 2 13 2 20a10 10 0 0 0 20 0C22 13 12 1 12 1Z" className="fill-secondary" />
        <path d="M7 20a5 5 0 0 0 5 5" className="stroke-background" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <span className={`font-bold tracking-tight text-primary ${big ? "text-4xl" : "text-2xl"}`}>
        {t("brand")}
      </span>
    </div>
  );
}
