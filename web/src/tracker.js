const DEFAULT_GOALS = {
  waterML: 2_000,
  waterGlasses: 8,
  glassML: 250,
  exerciseMinutes: 30,
  baselineWeightKg: 59.8,
  targetWeightKg: 55,
  baselineWaistIn: 31,
  targetWaistIn: 28,
};

const CALORIES_PER_MINUTE = {
  easy: 3.5,
  moderate: 5.5,
  hard: 7.5,
};

const BEVERAGE_MULTIPLIERS = {
  water: 1,
  coffee: 1,
  tea: 1,
  sportsDrink: 1.1,
  juice: 1.3,
  milk: 1.5,
  oralRehydration: 1.5,
};

export function createTrackerState(options = {}) {
  return {
    today: options.today ?? todayISO(),
    goals: { ...DEFAULT_GOALS, ...(options.goals ?? {}) },
    water: [],
    hydrationEntries: [],
    exercise: [],
    bodyStats: [],
    cheatLogs: [],
  };
}

export function addWater(state, entry) {
  const amountML = Math.max(0, Number(entry.amountML) || 0);

  if (amountML === 0) {
    return state;
  }

  return {
    ...state,
    water: [...state.water, { date: entry.date, amountML }],
    hydrationEntries: [
      ...(state.hydrationEntries ?? []),
      createHydrationEntry({
        date: entry.date,
        amountML,
        presetName: entry.presetName ?? "Custom",
        beverageType: entry.beverageType ?? "water",
      }),
    ],
  };
}

export function completeWaterMilestone(state, entry) {
  const totalGlasses = state.goals.waterGlasses ?? 8;
  const glassML = state.goals.glassML ?? Math.round(state.goals.waterML / totalGlasses);
  const glass = Math.min(totalGlasses, Math.max(0, Math.floor(Number(entry.glass) || 0)));

  if (glass === 0) {
    return state;
  }

  const targetML = glass * glassML;
  const currentML = hydrationTotalForDate(state, entry.date);

  return addWater(state, {
    date: entry.date,
    amountML: Math.max(0, targetML - currentML),
    presetName: `Glass ${glass}`,
    beverageType: "water",
  });
}

export function addHydrationEntry(state, entry) {
  const hydrationEntry = createHydrationEntry(entry);

  if (hydrationEntry.amountML === 0) {
    return state;
  }

  return {
    ...state,
    hydrationEntries: [...(state.hydrationEntries ?? []), hydrationEntry],
  };
}

export function addExercise(state, entry) {
  const minutes = Math.max(0, Number(entry.minutes) || 0);

  if (minutes === 0) {
    return state;
  }

  return {
    ...state,
    exercise: [
      ...state.exercise,
      {
        date: entry.date,
        minutes,
        intensity: entry.intensity ?? "moderate",
        label: entry.label ?? "Exercise",
      },
    ],
  };
}

export function logBodyStats(state, entry) {
  return {
    ...state,
    bodyStats: [...state.bodyStats, { ...entry }],
  };
}

export function addCheatLog(state, entry) {
  const label = String(entry.label ?? "").trim();

  if (!label) {
    return state;
  }

  return {
    ...state,
    cheatLogs: [
      ...(state.cheatLogs ?? []),
      {
        date: entry.date,
        type: entry.type === "drink" ? "drink" : "meal",
        label,
      },
    ],
  };
}

export function updateGoals(state, updates) {
  const nextGoals = { ...state.goals };

  for (const [key, value] of Object.entries(updates)) {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue) && numericValue > 0) {
      nextGoals[key] = numericValue;
    }
  }

  return {
    ...state,
    goals: nextGoals,
  };
}

export function summarizeDay(state, date = state.today) {
  const waterML = hydrationTotalForDate(state, date);
  const exerciseMinutes = sumByDate(state.exercise, date, "minutes");
  const activeCaloriesEstimate = state.exercise
    .filter((entry) => entry.date === date)
    .reduce((total, entry) => {
      const caloriesPerMinute = CALORIES_PER_MINUTE[entry.intensity] ?? CALORIES_PER_MINUTE.moderate;
      return total + entry.minutes * caloriesPerMinute;
    }, 0);
  const latestStats = [...state.bodyStats]
    .filter((entry) => entry.date <= date)
    .sort((left, right) => left.date.localeCompare(right.date))
    .at(-1);
  const waterRemaining = Math.max(0, state.goals.waterML - waterML);
  const movementRemaining = Math.max(0, state.goals.exerciseMinutes - exerciseMinutes);

  return {
    date,
    waterML,
    waterProgress: roundRatio(waterML / state.goals.waterML),
    exerciseMinutes,
    exerciseProgress: roundRatio(exerciseMinutes / state.goals.exerciseMinutes),
    activeCaloriesEstimate: Math.round(activeCaloriesEstimate),
    latestWeightKg: latestStats?.weightKg,
    weightChangeKg: roundOne((latestStats?.weightKg ?? state.goals.baselineWeightKg) - state.goals.baselineWeightKg),
    latestWaistIn: latestStats?.waistIn,
    waistChangeIn: roundOne((latestStats?.waistIn ?? state.goals.baselineWaistIn) - state.goals.baselineWaistIn),
    readiness: readinessFor({ waterML, exerciseMinutes }, state.goals),
    nextNudge: nudgeFor({ waterRemaining, movementRemaining }),
  };
}

export function summarizeWeek(state, date = state.today) {
  return daysEndingOn(date, 7).map((day) => {
    const hydrationML = hydrationTotalForDate(state, day);

    return {
      date: day,
      hydrationML,
      goalMet: hydrationML >= state.goals.waterML,
    };
  });
}

export function summarizeWaterMilestones(state, date = state.today) {
  const totalGlasses = state.goals.waterGlasses ?? 8;
  const glassML = state.goals.glassML ?? Math.round(state.goals.waterML / totalGlasses);
  const completedGlasses = Math.min(totalGlasses, Math.floor(hydrationTotalForDate(state, date) / glassML));

  return {
    completedGlasses,
    totalGlasses,
    glassML,
    complete: completedGlasses >= totalGlasses,
    milestones: Array.from({ length: totalGlasses }, (_, index) => ({
      glass: index + 1,
      complete: index < completedGlasses,
    })),
  };
}

export function summarizeCalendar(state, date = state.today) {
  return daysInWeekStartingMonday(date).map((day, index) => {
    const hydrationML = hydrationTotalForDate(state, day);
    const cheatsForDay = (state.cheatLogs ?? []).filter((entry) => entry.date === day);

    return {
      date: day,
      plannedExercise: index % 2 === 0,
      exerciseCompleted: state.exercise.some((entry) => entry.date === day),
      waterComplete: hydrationML >= state.goals.waterML,
      bodyCheckDue: index === 0,
      bodyCheckCompleted: state.bodyStats.some((entry) => entry.date === day),
      cheats: cheatsForDay.map((entry) => entry.type),
      cheatLabels: cheatsForDay.map((entry) => entry.label),
    };
  });
}

export function serializeTrackerState(state) {
  return JSON.stringify(state);
}

export function restoreTrackerState(serialized, options = {}) {
  try {
    const parsed = JSON.parse(serialized);

    return {
      ...createTrackerState(options),
      ...parsed,
      goals: { ...DEFAULT_GOALS, ...(parsed.goals ?? {}) },
      water: Array.isArray(parsed.water) ? parsed.water : [],
      hydrationEntries: Array.isArray(parsed.hydrationEntries) ? parsed.hydrationEntries : [],
      exercise: Array.isArray(parsed.exercise) ? parsed.exercise : [],
      bodyStats: Array.isArray(parsed.bodyStats) ? parsed.bodyStats : [],
      cheatLogs: Array.isArray(parsed.cheatLogs) ? parsed.cheatLogs : [],
    };
  } catch {
    return createTrackerState(options);
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function sumByDate(entries, date, field) {
  return entries
    .filter((entry) => entry.date === date)
    .reduce((total, entry) => total + entry[field], 0);
}

function createHydrationEntry(entry) {
  const amountML = Math.max(0, Number(entry.amountML) || 0);
  const beverageType = entry.beverageType ?? "water";
  const multiplier = BEVERAGE_MULTIPLIERS[beverageType] ?? BEVERAGE_MULTIPLIERS.water;

  return {
    date: entry.date,
    amountML,
    presetName: entry.presetName ?? "Custom",
    beverageType,
    effectiveML: Math.round(amountML * multiplier),
  };
}

function hydrationTotalForDate(state, date) {
  if (Array.isArray(state.hydrationEntries) && state.hydrationEntries.length > 0) {
    return state.hydrationEntries
      .filter((entry) => entry.date === date)
      .reduce((total, entry) => total + effectiveHydrationML(entry), 0);
  }

  return sumByDate(state.water ?? [], date, "amountML");
}

function effectiveHydrationML(entry) {
  if (Number.isFinite(entry.effectiveML)) {
    return entry.effectiveML;
  }

  const multiplier = BEVERAGE_MULTIPLIERS[entry.beverageType] ?? BEVERAGE_MULTIPLIERS.water;
  return Math.round((Number(entry.amountML) || 0) * multiplier);
}

function daysEndingOn(date, count) {
  const endDate = new Date(`${date}T00:00:00Z`);

  return Array.from({ length: count }, (_, index) => {
    const current = new Date(endDate);
    current.setUTCDate(endDate.getUTCDate() - (count - 1 - index));
    return current.toISOString().slice(0, 10);
  });
}

function daysInWeekStartingMonday(date) {
  const current = new Date(`${date}T00:00:00Z`);
  const dayOfWeek = current.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(current);
  monday.setUTCDate(current.getUTCDate() - daysSinceMonday);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setUTCDate(monday.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
}

function roundRatio(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.round(value * 1_000) / 1_000);
}

function roundOne(value) {
  return Math.round(value * 10) / 10;
}

function readinessFor(totals, goals) {
  const hitWater = totals.waterML >= goals.waterML;
  const hitExercise = totals.exerciseMinutes >= goals.exerciseMinutes;

  if (hitWater && hitExercise) {
    return "strong";
  }

  if (totals.waterML > 0 || totals.exerciseMinutes > 0) {
    return "steady";
  }

  return "start";
}

function nudgeFor(remaining) {
  if (remaining.waterRemaining === 0 && remaining.movementRemaining === 0) {
    return "Today is closed. Keep it boring and repeatable.";
  }

  const parts = [];

  if (remaining.waterRemaining > 0) {
    parts.push(`${remaining.waterRemaining} ml water`);
  }

  if (remaining.movementRemaining > 0) {
    parts.push(`${remaining.movementRemaining} min movement`);
  }

  return `Add ${parts.join(" and ")} to close today.`;
}
