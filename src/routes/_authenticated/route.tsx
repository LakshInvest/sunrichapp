import { AppLoader } from "@/components/AppLoader";
import { PermissionsIntro } from "@/components/PermissionsIntro";
import { Outlet, redirect, createFileRoute, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRegistration } from "@/lib/registration.functions";
import { isRateLockedStatus, setRateLocked } from "@/lib/rate-lock";
import { readGate, writeGate } from "@/lib/gate-cache";
import { clearSales, getSalesInfo, SALES_HIDDEN } from "@/lib/sales";
import { SalesBar } from "@/components/SalesBar";
import { useDataRefresh } from "@/hooks/use-data-refresh";
import { permittedAppAccount } from "@/lib/login-rules";
import { isRefreshForeground } from "@/lib/data-refresh";
import { swr } from "@/lib/swr-cache";

/**
 * Auth gate: every route under this pathless layout requires a signed-in
 * session. It runs client-side only (ssr: false) because the session lives
 * in browser storage. Unauthenticated visitors are sent to /auth; profiles
 * without a customer go to /registration, blocked ones to /hold.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Page changes reuse the last check (local session + cached registration);
    // a cold open starts from the saved check (≤24 h) and re-checks in the
    // background. The session-cancellation check in Gate always runs.
    const { data: local } = await supabase.auth.getSession();
    const localId = local.session?.user.id;
    const here = location.pathname;
    // Salesman (no own customer login): orders for a picked store.
    if (!localId) throw redirect({ to: "/auth" });
    const [sales, userType] = await Promise.all([
      getSalesInfo(localId),
      swr(`account-type.${localId}`, async () => {
        const { data: profile, error } = await supabase.from("user_profiles").select("user_type").eq("id", localId).maybeSingle();
        if (error) throw error;
        return profile?.user_type ?? null;
      }),
    ]);
    if (!permittedAppAccount(userType, sales.isSales)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    if (sales.isSales) {
      setRateLocked(false);
      if (!sales.picked) {
        if (here !== "/stores") throw redirect({ to: "/stores" });
        return;
      }
      if (SALES_HIDDEN.includes(here)) throw redirect({ to: "/home" });
      if (here === "/stores") return;
      return;
    }
    // Sales staff do not need a customer registration read before Home can render.
    const cached = readGate(localId);
    const reg = cached?.reg ?? await getMyRegistration();
    if (!cached) writeGate(localId, reg);
    if (here === "/stores") throw redirect({ to: "/home" });
    setRateLocked(isRateLockedStatus(reg.status));
    if (reg.status === "blocked") {
      if (here !== "/hold") throw redirect({ to: "/hold" });
      return;
    }
    // Awaiting approval is a support/details-only screen, not a catalogue.
    if (reg.status === "pending_approval") {
      if (here !== "/under-review") throw redirect({ to: "/under-review" });
      return;
    }
    if ((!reg.customerId || reg.status === "draft" || reg.status === "rejected") && here !== "/registration") {
      throw redirect({ to: "/registration" });
    }
  },
  component: Gate,
  pendingComponent: AppLoader,
  pendingMs: 0,
});

/** Signs the user out when their session row is missing or revoked. Checks on load and every 60s. */
function Gate() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const router = useRouter();
  useDataRefresh(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const old = readGate(data.session.user.id)?.reg;
    const [sales, reg] = await Promise.all([getSalesInfo(data.session.user.id, true), getMyRegistration()]);
    writeGate(data.session.user.id, reg);
    setRateLocked(!sales.isSales && isRateLockedStatus(reg.status));
    if (!old || old.status !== reg.status || old.customerId !== reg.customerId || (sales.isSales && !sales.picked && pathname !== "/stores") || (!sales.isSales && pathname === "/stores")) {
      await router.invalidate();
    }
  });
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (!isRefreshForeground()) return;
      const { data: sid, error: sidErr } = await supabase.rpc("current_session_id");
      if (stopped || sidErr) return; // network hiccup: try again next tick
      const { data: row, error } = sid
        ? await supabase.from("user_sessions").select("revoked_at").eq("session_id", sid).maybeSingle()
        : { data: null, error: null };
      if (stopped || error) return;
      if (!row || row.revoked_at) {
        stopped = true;
        sessionStorage.setItem("sunrich.loggedOut", "1");
        await queryClient.cancelQueries();
        queryClient.clear();
        await clearSales();
        await supabase.auth.signOut();
        await navigate({ to: "/auth", replace: true });
      }
    };
    void check();
    const id = setInterval(() => void check(), 60_000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [navigate, queryClient]);

  return (
    <>
      <SalesBar />
      <Outlet />
      {pathname !== "/under-review" && <PermissionsIntro />}
    </>
  );
}
