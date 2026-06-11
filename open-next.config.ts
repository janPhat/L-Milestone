import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental (ISR) cache override needed for v1 — this app is dynamic,
// per-user, and authenticated. Add r2IncrementalCache later if ISR is used.
export default defineCloudflareConfig({});
