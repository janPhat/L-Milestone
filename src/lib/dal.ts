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
  const auth = createAuth(env, cf as IncomingRequestCfProperties);
  return auth.api.getSession({ headers: await headers() });
});

/** Returns the authenticated user, or redirects to /sign-in. */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }
  return session.user;
}
