import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin, Search } from "lucide-react";
import { getPlaceDetails, placesAutocomplete } from "@/lib/maps.functions";
import { newSessionToken, type PlaceDetails } from "@/lib/maps";

type Suggestion = { placeId: string; main: string; secondary: string };

/**
 * Address search backed by server-side Google Places autocomplete, rendered as
 * an app-owned dropdown (no Google UI). Debounced; ignores stale responses.
 */
export function PlaceSearch({
  onPick,
  placeholder,
}: {
  onPick: (d: PlaceDetails) => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState(false);
  const tokenRef = useRef(newSessionToken());
  const seqRef = useRef(0);

  useEffect(() => {
    if (query.trim().length < 3) {
      setItems([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      const seq = ++seqRef.current;
      placesAutocomplete({ data: { input: query.trim(), sessionToken: tokenRef.current } })
        .then((s) => {
          if (seq !== seqRef.current) return;
          setItems(s);
          setOpen(s.length > 0);
          setSearching(false);
          if (s.length === 0) tokenRef.current = newSessionToken();
        })
        .catch(() => {
          if (seq !== seqRef.current) return;
          setItems([]);
          setOpen(false);
          setSearching(false);
          tokenRef.current = newSessionToken();
        });
    }, 350);
    return () => clearTimeout(id);
  }, [query]);

  const pick = async (s: Suggestion) => {
    setPicking(true);
    setOpen(false);
    const token = tokenRef.current;
    tokenRef.current = newSessionToken();
    try {
      const d = await getPlaceDetails({ data: { placeId: s.placeId, sessionToken: token } });
      if (d) {
        setQuery(s.main);
        onPick({ ...d, address: d.address || `${s.main}, ${s.secondary}` });
      }
    } catch {
      /* keep the previous pin */
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-secondary/40 bg-background px-3 focus-within:border-secondary">
        <Search className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
        <input
          className="min-h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? t("location.search")}
          autoComplete="off"
          aria-label={t("location.search")}
        />
        {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden />}
      </div>
      {open && items.length > 0 && (
        <ul
          role="listbox"
          aria-label={t("location.search")}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
        >
          {items.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => void pick(s)}
                className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{s.main}</span>
                  {s.secondary && (
                    <span className="block truncate text-xs text-muted-foreground">{s.secondary}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {picking && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm text-muted-foreground shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t("location.looking")}
        </div>
      )}
    </div>
  );
}
