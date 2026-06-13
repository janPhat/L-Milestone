import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { withCloudflare } from "better-auth-cloudflare";
import { drizzle } from "drizzle-orm/d1";
import { schema } from "../db";
import { resetPasswordEmail, sendEmail, verifyEmail } from "./email";

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
 * Registration is invite-only: the before-hook rejects /sign-up/email unless
 * the request carries an `x-invite-code` header matching env.INVITE_CODE. It is
 * fail-closed — if the secret is unset, all sign-ups are blocked.
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
    // Runtime always supplies env.BETTER_AUTH_SECRET. The fallback only applies
    // to the env-less CLI schema-generation / build-eval path, which never
    // serves requests, so the value is inert there.
    secret: env?.BETTER_AUTH_SECRET ?? "lhealth-schema-gen-placeholder-secret",
    ...withCloudflare(
      {
        autoDetectIpAddress: false,
        geolocationTracking: false,
        cf: cf ?? {},
        d1: env ? { db, options: { usePlural: true } } : undefined,
      },
      {
        emailAndPassword: {
          enabled: true,
          // Self-serve password reset — emails a link to /reset-password.
          sendResetPassword: async ({ user, url }) => {
            await sendEmail(env, {
              to: user.email,
              subject: "Reset your L Health password",
              html: resetPasswordEmail(user.name, url),
            });
          },
        },
        // Verification link on sign-up. NOT required to sign in, so a flaky or
        // undeliverable email never locks anyone out — turn on
        // requireEmailVerification later to enforce it.
        emailVerification: {
          sendOnSignUp: true,
          sendVerificationEmail: async ({ user, url }) => {
            await sendEmail(env, {
              to: user.email,
              subject: "Verify your L Health email",
              html: verifyEmail(user.name, url),
            });
          },
        },
        // Long-lived "stay signed in" sessions. Expire after 1 year, with the
        // expiry sliding forward on any request older than a day — so an active
        // user is effectively never logged out. Sign-in defaults to
        // rememberMe:true, so the cookie persists across browser restarts.
        session: {
          expiresIn: 60 * 60 * 24 * 365, // 1 year
          updateAge: 60 * 60 * 24, // refresh the expiry at most once per day
        },
        rateLimit: { enabled: true, window: 60, max: 100 },
        hooks: {
          before: createAuthMiddleware(async (ctx) => {
            if (ctx.path !== "/sign-up/email") return;
            const provided =
              ctx.headers?.get("x-invite-code") ??
              (ctx.body as { inviteCode?: string } | undefined)?.inviteCode;
            const expected = env?.INVITE_CODE;
            if (!expected || provided !== expected) {
              throw new APIError("FORBIDDEN", {
                message: "Sign-up is invite-only — a valid invite code is required.",
              });
            }
          }),
        },
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
