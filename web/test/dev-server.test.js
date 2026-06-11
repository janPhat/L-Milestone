import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dev preview > given local editing > then package exposes a live localhost server", () => {
  const packageJSON = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));

  assert.equal(packageJSON.scripts.dev, "node web/dev-server.mjs");
});

test("dev preview > given browser page is open > then server exposes reload events", () => {
  const serverSource = readFileSync(new URL("../dev-server.mjs", import.meta.url), "utf8");

  assert.match(serverSource, /\/__events/);
  assert.match(serverSource, /fileURLToPath/);
  assert.match(serverSource, /text\/event-stream/);
  assert.match(serverSource, /event:\s*reload/);
  assert.match(serverSource, /Cache-Control.*no-store/);
});
