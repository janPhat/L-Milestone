import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {};

export default nextConfig;

// Lets `next dev` see local Cloudflare bindings (D1, KV, ...). Must be called
// at the top level of next.config — see OpenNext Cloudflare docs.
initOpenNextCloudflareForDev();
