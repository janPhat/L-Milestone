import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { schema } from "./schema";

export { schema };
export * from "./schema";

/**
 * Returns a request-scoped Drizzle client bound to D1. Resolve bindings via
 * getCloudflareContext per request — never hold a module-level singleton that
 * captures a stale/absent binding under OpenNext.
 */
export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

export type Database = Awaited<ReturnType<typeof getDb>>;
