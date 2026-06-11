import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";

/**
 * Builds a Better Auth instance.
 *
 * - At runtime it is called per-request with the Cloudflare `env` so sessions
 *   and users live in D1 (the source of truth). Bindings resolve per-request
 *   via getCloudflareContext — never at module top level.
 * - With no arguments it is called by the Better Auth CLI to generate the
 *   Drizzle schema; the drizzleAdapter fallback below gives the CLI a SQLite
 *   provider to introspect without needing a live binding.
 *
 * Route protection is enforced in Server Components / Route Handlers / the DAL
 * via auth.api.getSession(), NOT in middleware (OpenNext does not run Node
 * middleware, and edge middleware cannot reach D1).
 */
export function createAuth(
  env?: CloudflareEnv,
  cf?: IncomingRequestCfProperties,
  baseURL?: string,
) {
  const db = env ? drizzle(env.DB, { schema }) : ({} as never);

  return betterAuth({
    baseURL,
    secret: env?.BETTER_AUTH_SECRET,
    ...withCloudflare(
      {
        autoDetectIpAddress: false,
        geolocationTracking: false,
        cf: cf ?? {},
        d1: env ? { db, options: { usePlural: true } } : undefined,
      },
      {
        emailAndPassword: { enabled: true },
        rateLimit: { enabled: true, window: 60, max: 100 },
      },
    ),
    // CLI schema-generation path (no runtime env/bindings).
    ...(env
      ? {}
      : {
          database: drizzleAdapter({} as never, {
            provider: "sqlite",
            usePlural: true,
          }),
        }),
  });
}

export const auth = createAuth();
