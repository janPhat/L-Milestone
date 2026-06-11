import {
  addCheatLog,
  addExercise,
  addWater,
  completeWaterMilestone,
  createTrackerState,
  logBodyStats,
  restoreTrackerState,
  serializeTrackerState,
  updateGoals,
} from "./tracker.js";
import { renderDashboard } from "./render.js";

const STORAGE_KEY = "l-health.tracker.v1";
const root = document.querySelector("#app");

let state = loadState();

render();

function render() {
  state = { ...state, today: todayISO() };
  root.innerHTML = renderDashboard(state, state.today);
  bindPhoneActions();
  bindWaterControls();
  bindExerciseForm();
  bindBodyForm();
  bindCheatForm();
  bindGoalsForm();
}

function bindPhoneActions() {
  root.querySelectorAll("[data-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = root.querySelector(`#${button.dataset.jump}`);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function bindWaterControls() {
  root.querySelectorAll("[data-water-milestone]").forEach((button) => {
    button.addEventListener("click", () => {
      state = completeWaterMilestone(state, {
        date: state.today,
        glass: Number(button.dataset.waterMilestone),
      });
      persistAndRender();
    });
  });

  root.querySelector('[data-form="water"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = addWater(state, {
      date: state.today,
      amountML: Number(data.get("amountML")),
    });
    persistAndRender();
  });
}

function bindExerciseForm() {
  root.querySelector('[data-form="exercise"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = addExercise(state, {
      date: state.today,
      label: String(data.get("label") || "Exercise"),
      minutes: Number(data.get("minutes")),
      intensity: String(data.get("intensity") || "moderate"),
    });
    persistAndRender();
  });
}

function bindBodyForm() {
  root.querySelector('[data-form="body"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = logBodyStats(state, {
      date: state.today,
      weightKg: optionalNumber(data.get("weightKg")),
      waistIn: optionalNumber(data.get("waistIn")),
    });
    persistAndRender();
  });
}

function bindCheatForm() {
  root.querySelector('[data-form="cheat"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = addCheatLog(state, {
      date: state.today,
      type: String(data.get("type") || "meal"),
      label: String(data.get("label") || ""),
    });
    persistAndRender();
  });
}

function bindGoalsForm() {
  root.querySelector('[data-form="goals"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state = updateGoals(state, {
      waterML: data.get("waterML"),
      exerciseMinutes: data.get("exerciseMinutes"),
      targetWeightKg: data.get("targetWeightKg"),
      targetWaistIn: data.get("targetWaistIn"),
    });
    persistAndRender();
  });
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, serializeTrackerState(state));
  render();
}

function loadState() {
  const savedState = localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return createTrackerState({ today: todayISO() });
  }

  return restoreTrackerState(savedState, { today: todayISO() });
}

function optionalNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : undefined;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
