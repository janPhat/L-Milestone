import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("index shell > given static browser cache > then app script is versioned", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  assert.match(html, /href="\.\/styles\.css\?v=glass-milestones"/);
  assert.match(html, /src="\.\/src\/app\.js\?v=fixed-brand-topbar"/);
  assert.match(html, /src="\.\/src\/live-reload\.js\?v=localhost-dev"/);
});
