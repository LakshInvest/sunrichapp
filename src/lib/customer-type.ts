import { useEffect, useState } from "react";
import { getMyRegistration } from "@/lib/registration.functions";

const BUSINESS = new Set(["RETAILER", "DISTRIBUTOR", "HORECA", "INSTITUTION"]);
/** Business customers see "Margin"; Home customers see "Save". */
export const isBusinessType = (code: string | null | undefined) => !!code && BUSINESS.has(code.toUpperCase());

const KEY = "sunrich.typeCode";
let mem: string | null | undefined;
let inflight: Promise<string | null> | null = null;

export function clearTypeCode() {
  mem = undefined;
  inflight = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** The signed-in customer's type code (cached for the session). */
export function useTypeCode(): string | null {
  const [code, setCode] = useState<string | null>(mem ?? null);
  useEffect(() => {
    if (mem === undefined) {
      try {
        const v = localStorage.getItem(KEY);
        if (v) setCode(v);
      } catch {
        /* ignore */
      }
    }
    inflight ??= getMyRegistration()
      .then((r) => {
        mem = r.typeCode ?? null;
        try {
          if (mem) localStorage.setItem(KEY, mem);
        } catch {
          /* ignore */
        }
        return mem;
      })
      .catch(() => null);
    let on = true;
    void inflight.then((v) => on && v !== null && setCode(v));
    return () => {
      on = false;
    };
  }, []);
  return code;
}
