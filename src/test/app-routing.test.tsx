import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  const lastRouteId = (path: string) => {
    const matches = router.matchRoutes(path);
    return matches.at(-1)?.routeId;
  };

  it("matches a page for / instead of falling back to not found", () => {
    expect(lastRouteId("/")).not.toBe(rootRouteId);
  });

  it("matches the login page at /auth", () => {
    expect(lastRouteId("/auth")).toBe("/auth");
  });

  it("matches the registration placeholder at /registration", () => {
    expect(lastRouteId("/registration")).toBe("/_authenticated/registration");
  });

  it("matches the on-hold screen at /hold", () => {
    expect(lastRouteId("/hold")).toBe("/_authenticated/hold");
  });

  it("matches the four bottom-nav pages", () => {
    expect(lastRouteId("/home")).toBe("/_authenticated/home");
    expect(lastRouteId("/order")).toBe("/_authenticated/order");
    expect(lastRouteId("/track")).toBe("/_authenticated/track/");
    expect(lastRouteId("/account")).toBe("/_authenticated/account");
  });

  it("matches the order detail inside the track layout", () => {
    expect(lastRouteId("/track/abc-def")).toBe("/_authenticated/track/$id");
  });

  it("matches the queries list and thread pages", () => {
    expect(lastRouteId("/queries")).toBe("/_authenticated/queries/");
    expect(lastRouteId("/queries/abc-def")).toBe("/_authenticated/queries/$id");
  });
});
