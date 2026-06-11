import test from "node:test";
import assert from "node:assert/strict";

import { addCheatLog, addExercise, addWater, createTrackerState, logBodyStats } from "../src/tracker.js";
import { renderDashboard } from "../src/render.js";

test("dashboard render > given today's progress > then Final Design home surfaces the tracked progress", () => {
  let state = createTrackerState({
    today: "2026-06-08",
    goals: {
      waterML: 2_000,
      exerciseMinutes: 30,
      baselineWeightKg: 59.8,
      baselineWaistIn: 31,
      targetWeightKg: 55,
      targetWaistIn: 28,
    },
  });

  state = addWater(state, { date: "2026-06-08", amountML: 1_250 });
  state = addExercise(state, {
    date: "2026-06-08",
    minutes: 25,
    intensity: "moderate",
    label: "Dumbbell full body",
  });
  state = logBodyStats(state, {
    date: "2026-06-08",
    weightKg: 59.1,
    waistIn: 30.2,
  });
  state = addCheatLog(state, {
    date: "2026-06-08",
    type: "drink",
    label: "Pepsi 2 แก้ว",
  });

  const html = renderDashboard(state, "2026-06-08");

  assert.match(html, /Hello Kirsah!/);
  assert.match(html, /1,250 \/ 2,000 ml/);
  assert.match(html, /59.1/);
  assert.match(html, /Start/);
  assert.match(html, /Now/);
  assert.match(html, /Pepsi 2 แก้ว/);
  assert.match(html, /8 Jun to 14 Jun/);
});

test("dashboard render > given habit features > then mockup sections are visible", () => {
  const state = createTrackerState({ today: "2026-06-08" });

  const html = renderDashboard(state, "2026-06-08");

  assert.match(html, /Hello Kirsah!/);
  assert.match(html, /<span>Mon<\/span>[\s\S]*<strong>8<\/strong>/);
  assert.match(html, /8 Glasses of Water/);
  assert.match(html, /Cheated Drinks and Meals/);
  assert.match(html, /Weekly Exercise Plan/);
  assert.match(html, /Start/);
  assert.match(html, /Now/);
  assert.match(html, /June/);
  assert.match(html, /2026/);
  assert.match(html, /Setting/);
  assert.match(html, /Analysis/);
});

test("dashboard render > given Final Design mockup order > then greeting is above water and water is above cheat log", () => {
  const state = createTrackerState({ today: "2026-06-08" });

  const html = renderDashboard(state, "2026-06-08");

  assert.ok(html.indexOf("Hello Kirsah!") < html.indexOf("8 Glasses of Water"));
  assert.ok(html.indexOf("8 Glasses of Water") < html.indexOf("Cheated Drinks and Meals"));
});

test("dashboard render > given water milestones > then each mockup glass is clickable with its number below", () => {
  const state = addWater(createTrackerState({ today: "2026-06-06" }), {
    date: "2026-06-06",
    amountML: 750,
  });

  const html = renderDashboard(state, "2026-06-06");

  assert.equal(html.match(/<button class="milestone-item water-glass/g)?.length, 8);
  assert.equal(html.match(/type="button" data-water-milestone="/g)?.length, 8);
  assert.equal(html.match(/class="glass-cup"/g)?.length, 8);
  assert.equal(html.match(/milestone-item water-glass filled/g)?.length, 3);
  assert.match(html, /<span class="glass-number">1<\/span>/);
  assert.match(html, /<span class="glass-number">8<\/span>/);
});

test("dashboard render > given clickable glasses > then old water entry controls are removed", () => {
  const state = createTrackerState({ today: "2026-06-06" });

  const html = renderDashboard(state, "2026-06-06");

  assert.doesNotMatch(html, /class="quick-row"/);
  assert.doesNotMatch(html, /data-water="/);
  assert.doesNotMatch(html, /\+1 glass|\+2 glasses|\+750/);
  assert.doesNotMatch(html, /Custom ml/);
  assert.doesNotMatch(html, /Add water/);
});

test("dashboard render > given Setting and Analysis are later > then they render as inert actions", () => {
  const state = createTrackerState({ today: "2026-06-08" });

  const html = renderDashboard(state, "2026-06-08");

  assert.match(html, /<button class="bottom-action setting-action" type="button" aria-disabled="true">Setting<\/button>/);
  assert.match(html, /<button class="bottom-action analysis-action" type="button" aria-disabled="true">Analysis<\/button>/);
});
