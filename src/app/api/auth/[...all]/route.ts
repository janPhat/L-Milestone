import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createAuth } from "@/lib/auth";

// All sign-up / sign-in / session work runs here, on the Workers runtime with
// full D1 access (NOT in middleware). One auth instance per request.
async function handler(req: Request) {
  const { env, cf } = await getCloudflareContext({ async: true });
  const auth = createAuth(
    env,
    cf as IncomingRequestCfProperties,
    new URL(req.url).origin,
  );
  return auth.handler(req);
}

export { handler as GET, handler as POST };
