import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Search, X } from "lucide-react";

/** Search input with recent-search chips (last 5, localStorage). */
export function SearchBox({
  value,
  onChange,
  onSubmit,
  recents,
  onPickRecent,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  recents: string[];
  onPickRecent: (v: string) => void;
}) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const showRecents = focused && value.trim() === "" && recents.length > 0;

  return (
    <div className="relative">
      <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-lg shadow-primary/5">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit(value);
          }}
          placeholder={t("home.searchPlaceholder")}
          aria-label={t("home.searchPlaceholder")}
          className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      {showRecents && (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 rounded-2xl border border-border bg-card p-2 shadow-xl">
          <p className="flex items-center gap-1.5 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {t("catalog.recentSearches")}
          </p>
          {recents.map((r) => (
            <button
              key={r}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPickRecent(r)}
              className="flex min-h-10 w-full items-center gap-2 rounded-xl px-2 text-left text-sm text-foreground transition active:bg-secondary/10"
            >
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{r}</span>
            </button>
          ))}
        </div>
      )}
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("catalog.clearSearch")}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition active:scale-90"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
