import { useEffect, useState } from "react";
import type { SavedAddress } from "@/lib/addresses";

/** Device-remembered delivery address (header + checkout preselect). Stores the id only. */
const KEY = "sunrich.selectedAddress";
const EVT = "sunrich:selected-address";

export function readSelectedAddressId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setSelectedAddressId(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVT));
}

export function useSelectedAddressId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setId(readSelectedAddressId());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return id;
}

/** Selected id if still saved, else the default, else the first. */
export function pickSelected(list: SavedAddress[], id: string | null): SavedAddress | null {
  return list.find((a) => a.id === id) ?? list.find((a) => a.isDefault) ?? list[0] ?? null;
}

/** One short area line for the header. */
export function shortArea(a: Pick<SavedAddress, "line1" | "line2" | "landmark" | "city">): string {
  return [a.line2 || a.landmark || a.line1, a.city].filter(Boolean).join(", ");
}
