import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createTrackerState } from "../src/tracker.js";
import { renderDashboard } from "../src/render.js";

test("dashboard design > given Final Design SVG reference > then phone-only milestone page renders", () => {
  const html = renderDashboard(createTrackerState({ today: "2026-06-08" }), "2026-06-08");
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(html, /class="kirsah-app"/);
  assert.match(html, /Hello Kirsah!/);
  assert.match(html, /class="weekday-strip"/);
  assert.match(html, /8 Glasses of Water/);
  assert.match(html, /Cheated Drinks and Meals/);
  assert.match(html, /Weekly Exercise Plan/);
  assert.match(html, /class="progress-stat-row"/);
  assert.match(html, /class="month-calendar"/);
  assert.match(html, /Setting/);
  assert.match(html, /Analysis/);
  assert.doesNotMatch(html, /Balanced Path|Health Rate|side-nav|KIRSAH|MILSTONE|phone-status/);
  assert.match(styles, /--page:\s*#fff8f0/);
  assert.match(styles, /--kirsah-orange:\s*#ff8a00/);
  assert.match(styles, /--kirsah-blue:\s*#8ad6ff/);
  assert.match(styles, /@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=Antonio:wght@700;800&display=swap"\)/);
  assert.match(styles, /@font-face\s*{[\s\S]*font-family:\s*"Poltab"[\s\S]*font-weight:\s*900[\s\S]*url\("\.\/fonts\/Poltab-Black\.ttf"\)/);
  assert.match(styles, /@font-face\s*{[\s\S]*font-family:\s*"Poltab"[\s\S]*font-weight:\s*800[\s\S]*url\("\.\/fonts\/Poltab-ExtraBold\.ttf"\)/);
  assert.match(styles, /@font-face\s*{[\s\S]*font-family:\s*"Poltab"[\s\S]*font-weight:\s*700[\s\S]*url\("\.\/fonts\/Poltab-Bold\.ttf"\)/);
  assert.match(styles, /@font-face\s*{[\s\S]*font-family:\s*"Mozzarella Cheese"[\s\S]*url\("\.\/fonts\/Mozzarella%20Cheese\.otf"\)/);
  assert.match(styles, /--display-font:\s*"Poltab",\s*"Antonio"/);
  assert.match(styles, /--hand-font:\s*"Mozzarella Cheese",\s*"Lazydog"/);
  assert.match(styles, /\.kirsah-app\s*{[\s\S]*max-width:\s*412px/);
  assert.match(styles, /\.hello-title\s*{[\s\S]*font-family:\s*var\(--hand-font\)/);
  assert.match(styles, /\.weekday-strip\s*{[\s\S]*grid-template-columns:\s*repeat\(7,\s*1fr\)/);
  assert.match(styles, /\.water-card\s*{[\s\S]*min-height:\s*120px/);
  assert.match(styles, /\.water-label\s*{[\s\S]*background:\s*var\(--kirsah-blue\)[\s\S]*transform:\s*rotate\(-3\.13958deg\)/);
  assert.match(styles, /\.exercise-label\s*{[\s\S]*transform:\s*rotate\(3\.45748deg\)/);
  assert.match(styles, /\.month-calendar header\s*{[\s\S]*background:\s*transparent/);
  assert.match(styles, /\.bottom-actions\s*{[\s\S]*grid-template-columns:\s*1fr 1fr/);
});

test("dashboard design > given SVG mobile width > then page keeps reference spacing and no desktop shell", () => {
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.app-shell\s*{[\s\S]*padding:\s*0/);
  assert.match(styles, /\.kirsah-app\s*{[\s\S]*padding:\s*39px 26px 28px/);
  assert.match(styles, /\.cheat-card\s*{[\s\S]*min-height:\s*175px/);
  assert.match(styles, /\.exercise-card\s*{[\s\S]*min-height:\s*124px/);
  assert.doesNotMatch(styles, /dashboard-shell|side-nav|appointment-panel|brand-topbar|phone-status/);
});

test("dashboard design > given water milestones > then glasses stay connected in one mobile row", () => {
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.milestone-grid::before\s*{[\s\S]*height:\s*3px/);
  assert.match(styles, /\.glass-cup\s*{[\s\S]*border-radius:\s*4px 4px 8px 8px/);
  assert.match(styles, /\.glass-number\s*{[\s\S]*font-size:\s*0\.56rem/);
  assert.match(
    styles,
    /\.milestone-grid\s*{[\s\S]*grid-template-columns:\s*repeat\(8,\s*minmax\(0,\s*1fr\)\)/,
  );
});
