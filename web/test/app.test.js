import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("app interactions > given water milestone buttons > then clicking a glass completes that milestone", () => {
  const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(source, /completeWaterMilestone/);
  assert.match(source, /\[data-water-milestone\]/);
  assert.match(source, /Number\(button\.dataset\.waterMilestone\)/);
  assert.doesNotMatch(source, /\[data-water\]/);
  assert.doesNotMatch(source, /button\.dataset\.water\b/);
});

test("app interactions > given Setting and Analysis are visual placeholders > then missing later forms are skipped safely", () => {
  const source = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

  assert.match(source, /root\.querySelector\('\[data-form="water"\]'\)\?\.addEventListener/);
  assert.match(source, /root\.querySelector\('\[data-form="exercise"\]'\)\?\.addEventListener/);
  assert.match(source, /root\.querySelector\('\[data-form="body"\]'\)\?\.addEventListener/);
  assert.match(source, /root\.querySelector\('\[data-form="goals"\]'\)\?\.addEventListener/);
});
