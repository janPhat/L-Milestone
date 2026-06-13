import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";

/**
 * Data Access Layer for auth. This — not middleware — is where real session
 * validation happens (it reaches D1 on the Workers runtime). `cache()` dedupes
 * the lookup within a single request.
 */
export const getSession = cache(async () => {
  const { env, cf } = await getCloudflareContext({ async: true });
  const requestHeaders = await headers();
  // Give Better Auth an explicit baseURL derived from the request origin (the
  // same value the /api/auth route handler uses via new URL(req.url).origin).
  // Without it Better Auth warns on every request. Works in dev (localhost) and
  // prod (the Worker host) with no env/secret dependency.
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const baseURL = host ? `${proto}://${host}` : undefined;
  const auth = createAuth(env, cf as IncomingRequestCfProperties, baseURL);
  return auth.api.getSession({ headers: requestHeaders });
});

/** Returns the authenticated user, or redirects to /sign-in. */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session.user;
}
