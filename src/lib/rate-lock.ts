import { useSyncExternalStore } from "react";

/**
 * Rates stay hidden until the customer is approved (status "active").
 * The auth gate and Home refresh this on every app open / navigation / pull.
 */
let locked = false;
const subs = new Set<() => void>();

export function isRateLockedStatus(status: string | null | undefined): boolean {
  return status != null && status !== "active";
}

export function setRateLocked(v: boolean) {
  if (v === locked) return;
  locked = v;
  subs.forEach((f) => f());
}

export function useRateLocked(): boolean {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => locked,
    () => false,
  );
}

type Req = { code: string; requirement: string; oneOfGroup: string | null };
type Up = { docTypeCode: string; status: string };

/** True when any required document (or one-of group) has no non-rejected upload. */
export function hasMissingDocs(requirements: Req[], uploaded: Up[]): boolean {
  const has = (code: string) => uploaded.some((u) => u.docTypeCode === code && u.status !== "rejected");
  const groups = new Map<string, Req[]>();
  for (const r of requirements) {
    if (r.oneOfGroup) groups.set(r.oneOfGroup, [...(groups.get(r.oneOfGroup) ?? []), r]);
    else if (r.requirement === "required" && !has(r.code)) return true;
  }
  for (const reqs of groups.values()) {
    if (reqs.some((r) => r.requirement === "required") && !reqs.some((r) => has(r.code))) return true;
  }
  return false;
}
