/** One refresh signal for imperative screens and the Query cache. */
export const REFRESH_INTERVAL_MS = 30_000;
const listeners = new Set<() => void>();
let foreground = true;
export function canRefresh(visible: boolean, online: boolean, active = foreground) {
  return visible && online && active;
}
export function setRefreshForeground(active: boolean) { foreground = active; }
export function requestDataRefresh() { listeners.forEach((refresh) => refresh()); }
export function onDataRefresh(refresh: () => void) {
  listeners.add(refresh);
  return () => { listeners.delete(refresh); };
}
export function isRefreshForeground() {
  return canRefresh(document.visibilityState === "visible", navigator.onLine);
}