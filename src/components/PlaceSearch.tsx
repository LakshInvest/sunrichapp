import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, MapPin, Search } from "lucide-react";
import {
  autocompletePlaces,
  loadGoogleMaps,
  newSessionToken,
  placeDetails,
  type PlaceDetails,
} from "@/lib/gmaps";

type Pred = google.maps.places.PlacePrediction;

/**
 * Address search backed by the browser's new Places autocomplete (no Google
 * UI), rendered as an app-owned dropdown. Debounced; ignores stale responses.
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
  const [items, setItems] = useState<Pred[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(false);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const seqRef = useRef(0);

  const ensureToken = async () => (tokenRef.current ??= await newSessionToken());

  useEffect(() => {
    if (query.trim().length < 3) {
      setItems([]);
      setOpen(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      const seq = ++seqRef.current;
      try {
        const token = await ensureToken();
        const preds = await autocompletePlaces(query.trim(), token);
        if (seq !== seqRef.current) return;
        setError(false);
        setItems(preds);
        setOpen(preds.length > 0);
        setSearching(false);
        if (preds.length === 0) tokenRef.current = await newSessionToken();
      } catch {
        if (seq !== seqRef.current) return;
        setItems([]);
        setOpen(false);
        setSearching(false);
        setError(true);
        tokenRef.current = null;
      }
    }, 350);
    return () => clearTimeout(id);
  }, [query]);

  const pick = async (p: Pred) => {
    setPicking(true);
    setOpen(false);
    try {
      const d = await placeDetails(p);
      tokenRef.current = await newSessionToken();
      if (d) {
        setQuery(span(p) || d.address);
        onPick(d);
      }
    } catch {
      tokenRef.current = null;
      setError(true);
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
          {items.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => void pick(p)}
                className="flex w-full items-start gap-2.5 px-3 py-3 text-left transition hover:bg-muted"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{span(p)}</span>
                  {sec(p) && <span className="block truncate text-xs text-muted-foreground">{sec(p)}</span>}
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
      {error && !open && (
        <p role="status" className="mt-1 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t("location.error")}
        </p>
      )}
    </div>
  );
}

function span(p: Pred): string {
  return (p.mainText && String(p.mainText)) || (p.text && String(p.text)) || "";
}
function sec(p: Pred): string {
  return p.secondaryText ? String(p.secondaryText) : "";
}
