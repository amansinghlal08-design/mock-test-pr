import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Health check for uptime monitors (e.g. UptimeRobot). Reachable at
 * https://<your-project>.convex.site/health — returns 200 with JSON so a
 * monitor can confirm the backend is alive.
 */
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "MockTest.pro",
        time: Date.now(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

export default http;
