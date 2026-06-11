import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` produces SQL migrations from the schema; `wrangler d1
// migrations apply` applies them (no Cloudflare credentials needed to generate).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
});
