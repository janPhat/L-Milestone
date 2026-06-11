import { summarizeCalendar, summarizeDay, summarizeWaterMilestones } from "./tracker.js";

const FALLBACK_CHEATS = ["Cheated drink", "Cheated drink", "Cheated drink", "Cheated drink"];

export function renderDashboard(state, date = state.today) {
  const summary = summarizeDay(state, date);
  const waterMilestones = summarizeWaterMilestones(state, date);
  const weekDays = summarizeCalendar(state, date);
  const latestBodyCheck = latestBodyStats(state, date);
  const startWeightKg = state.goals.baselineWeightKg;
  const currentWeightKg = summary.latestWeightKg ?? startWeightKg;

  return `
    <main class="kirsah-app" aria-labelledby="kirsah-title">
      <h1 class="hello-title" id="kirsah-title">Hello Kirsah!</h1>
      ${weekdayStrip(weekDays, date)}
      ${waterCard(summary, state, waterMilestones)}
      ${cheatCard(state, date)}
      ${exerciseCard(weekDays)}
      ${progressStatRow(startWeightKg, currentWeightKg, latestBodyCheck, date)}
      ${monthCalendar(state, date, weekDays)}

      <nav class="bottom-actions" aria-label="Later app sections">
        <button class="bottom-action setting-action" type="button" aria-disabled="true">Setting</button>
        <button class="bottom-action analysis-action" type="button" aria-disabled="true">Analysis</button>
      </nav>
    </main>
  `;
}

function weekdayStrip(weekDays, date) {
  return `
    <nav class="weekday-strip" aria-label="Week dates">
      ${weekDays
        .map(
          (day) => `
            <span class="weekday-chip${day.date === date ? " active" : ""}" aria-current="${day.date === date ? "date" : "false"}">
              <span>${titleWeekday(day.date)}</span>
              <strong>${dayNumber(day.date)}</strong>
            </span>
          `,
        )
        .join("")}
    </nav>
  `;
}

function waterCard(summary, state, waterMilestones) {
  return `
    <section class="water-card" id="water" aria-label="8 glasses of water per day tracking">
      <div class="sticker-label water-label">8 Glasses of Water</div>
      <p class="water-total">${formatNumber(summary.waterML)} / ${formatNumber(state.goals.waterML)} ml</p>
      ${waterMilestoneGrid(waterMilestones)}
    </section>
  `;
}

function waterMilestoneGrid(summary) {
  return `
    <div class="milestone-grid" aria-label="8 glass water milestones">
      ${summary.milestones
        .map(
          (milestone) =>
            `<button class="milestone-item water-glass${milestone.complete ? " filled" : ""}" type="button" data-water-milestone="${milestone.glass}" aria-label="Fill to glass ${milestone.glass}" aria-pressed="${milestone.complete}"><span class="glass-cup" aria-hidden="true"></span><span class="glass-number">${milestone.glass}</span></button>`,
        )
        .join("")}
    </div>
  `;
}

function cheatCard(state, date) {
  const chips = cheatChips(state, date);

  return `
    <form class="cheat-card" id="cheat" data-form="cheat" aria-label="Cheated drinks and meals">
      <h2>Cheated Drinks and Meals</h2>
      <div class="cheat-entry-row">
        <input name="label" type="text" placeholder="Insert here . . ." aria-label="Cheated meal or drink">
        <input name="type" type="hidden" value="meal">
        <button type="submit">Add</button>
      </div>
      <div class="cheat-chip-row" aria-label="Recent cheated drinks and meals">
        ${chips.map((chip) => `<span>${escapeHTML(chip)}</span>`).join("")}
      </div>
    </form>
  `;
}

function cheatChips(state, date) {
  const logged = (state.cheatLogs ?? [])
    .filter((entry) => entry.date <= date)
    .slice(-5)
    .map((entry) => entry.label)
    .filter(Boolean);

  return logged.length > 0 ? logged : FALLBACK_CHEATS;
}

function exerciseCard(weekDays) {
  const start = weekDays[0]?.date ?? "";
  const end = weekDays.at(-1)?.date ?? "";

  return `
    <section class="exercise-card" id="exercise" aria-label="Weekly exercise plan">
      <div class="sticker-label exercise-label">Weekly Exercise Plan</div>
      <p class="week-range">${formatDayMonthLong(start)} to ${formatDayMonthLong(end)}</p>
      <div class="exercise-week">
        ${weekDays
          .map(
            (day) => `
              <article class="${day.plannedExercise ? "exercise-day workout" : "exercise-day light"}${day.exerciseCompleted ? " complete" : ""}">
                <span class="${day.plannedExercise ? "dumbbell-icon" : "shoe-icon"}" aria-hidden="true"></span>
                <strong>${titleWeekday(day.date)}</strong>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function progressStatRow(startWeightKg, currentWeightKg, latestBodyCheck, date) {
  const recordedDate = latestBodyCheck?.date ?? date;

  return `
    <section class="progress-stat-row" id="body" aria-label="Body progress">
      <article class="stat-ticket">
        <span>Start</span>
        <strong>${formatStatValue(startWeightKg)}</strong>
      </article>
      <article class="stat-ticket">
        <span>Now</span>
        <strong>${formatStatValue(currentWeightKg)}</strong>
      </article>
      <p>Recorded on ${formatDayMonthLong(recordedDate)}</p>
    </section>
  `;
}

function monthCalendar(state, date, weekDays) {
  const weeks = monthGrid(date);
  const weekDates = new Set(weekDays.map((day) => day.date));
  const loggedWaterDates = new Set((state.water ?? []).map((entry) => entry.date));
  const hydrationDates = new Set((state.hydrationEntries ?? []).map((entry) => entry.date));
  const cheatDates = new Set((state.cheatLogs ?? []).map((entry) => entry.date));
  const exerciseDates = new Set((state.exercise ?? []).map((entry) => entry.date));
  const monthDate = new Date(`${date}T00:00:00Z`);

  return `
    <section class="month-calendar" id="summary-calendar" aria-label="Summary calendar">
      <header>
        <h2>${monthName(date)}</h2>
        <strong>${monthDate.getUTCFullYear()}</strong>
      </header>
      <div class="calendar-weekdays" aria-hidden="true">
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
      </div>
      <div class="calendar-days">
        ${weeks
          .map((day) => {
            const classes = [
              "calendar-date",
              day.inMonth ? "" : "muted",
              weekDates.has(day.date) ? "week-date" : "",
              day.date === date ? "today" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const hasWater = loggedWaterDates.has(day.date) || hydrationDates.has(day.date);
            const markers = [
              hasWater ? '<span class="day-water" aria-label="Water logged"></span>' : "",
              cheatDates.has(day.date) ? '<span class="day-cheat" aria-label="Cheat logged"></span>' : "",
              exerciseDates.has(day.date) ? '<span class="day-exercise" aria-label="Exercise logged"></span>' : "",
            ].join("");

            return `<span class="${classes}"><strong>${day.label}</strong>${markers}</span>`;
          })
          .join("")}
      </div>
    </section>
  `;
}

function monthGrid(date) {
  const current = new Date(`${date}T00:00:00Z`);
  const year = current.getUTCFullYear();
  const month = current.getUTCMonth();
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const start = new Date(firstOfMonth);
  const daysSinceMonday = (firstOfMonth.getUTCDay() + 6) % 7;
  start.setUTCDate(firstOfMonth.getUTCDate() - daysSinceMonday);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);

    return {
      date: day.toISOString().slice(0, 10),
      label: String(day.getUTCDate()),
      inMonth: day.getUTCMonth() === month,
    };
  });
}

function latestBodyStats(state, date) {
  return [...state.bodyStats]
    .filter((entry) => entry.date <= date)
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);
}

function weekdayLabel(date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`))
    .toUpperCase();
}

function titleWeekday(date) {
  const day = weekdayLabel(date).toLowerCase();
  return `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
}

function dayNumber(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDate();
}

function formatDayMonthLong(date) {
  if (!date) {
    return "";
  }

  const current = new Date(`${date}T00:00:00Z`);
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(current);
  return `${current.getUTCDate()} ${month}`;
}

function monthName(date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

function formatStatValue(value) {
  return Number(value).toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return replacements[character];
  });
}
