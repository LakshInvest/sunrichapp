import { AppLoader } from "@/components/AppLoader";
import { Outlet, redirect, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRegistration } from "@/lib/registration.functions";

/**
 * Auth gate: every route under this pathless layout requires a signed-in
 * session. It runs client-side only (ssr: false) because the session lives
 * in browser storage. Unauthenticated visitors are sent to /auth; profiles
 * without a customer go to /registration, blocked ones to /hold.
 */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth" });
    }
    const reg = await getMyRegistration();
    const here = location.pathname;
    if (reg.status === "blocked") {
      if (here !== "/hold") throw redirect({ to: "/hold" });
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
