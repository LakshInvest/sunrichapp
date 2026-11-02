import { AppLoader } from "@/components/AppLoader";
import { Outlet, redirect, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRegistration } from "@/lib/registration.functions";
import { isRateLockedStatus, setRateLocked } from "@/lib/rate-lock";
import { readGate, writeGate } from "@/lib/gate-cache";

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
    const cached = localId ? readGate(localId) : null;
    let reg;
    if (cached && localId) {
      reg = cached.reg;
      if (cached.stale) {
        const before = reg;
        void getMyRegistration()
          .then((r) => {
            writeGate(localId, r);
            // Status changed since the saved check: reload so routing re-applies.
            if (r.status !== before.status || r.customerId !== before.customerId) window.location.reload();
            setRateLocked(isRateLockedStatus(r.status));
          })
          .catch(() => undefined);
      }
    } else {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw redirect({ to: "/auth" });
      }
      reg = await getMyRegistration();
      writeGate(data.user.id, reg);
    }
    setRateLocked(isRateLockedStatus(reg.status));
    const here = location.pathname;
    if (reg.status === "blocked") {
      if (here !== "/hold") throw redirect({ to: "/hold" });
      return;
    }
    // Pending customers browse (rates hidden) but cannot reach cart/checkout.
    if (reg.status === "pending_approval" && (here === "/cart" || here === "/checkout")) {
      throw redirect({ to: "/home" });
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
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    let stopped = false;
    const check = async () => {
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

  return <Outlet />;
}
