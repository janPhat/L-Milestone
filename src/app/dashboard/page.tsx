import { getDashboardData } from "@/lib/tracker-data";
import { SignOutButton } from "@/components/sign-out-button";
import { WaterCard } from "@/components/dashboard/water-card";
import { ExerciseCard } from "@/components/dashboard/exercise-card";
import { WeeklyBodyCheckCard } from "@/components/dashboard/weekly-body-check-card";
import { WeeklyChart } from "@/components/dashboard/weekly-chart";
import { WeekCalendar } from "@/components/dashboard/week-calendar";
import { CheatLogCard } from "@/components/dashboard/cheat-log-card";
import { GoalsDialog } from "@/components/dashboard/goals-dialog";

// Real session enforcement + the Phase-4 summaries over the user's D1 rows
// happen in getDashboardData(); each section is a client component wired to a
// server action that revalidates this route.
export default async function DashboardPage() {
  const {
    user,
    today,
    day,
    goals,
    milestones,
    week,
    calendar,
    movement,
    bodyCheckDay,
    cheats,
  } = await getDashboardData();

  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4 pb-16">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-[40px] font-bold tracking-tight">Hello L!</h1>
      </header>

      <WeekCalendar calendar={calendar} today={today} movement={movement} />
      <WeeklyBodyCheckCard
        day={day}
        goals={goals}
        today={today}
        bodyCheckDay={bodyCheckDay}
      />
      <WaterCard milestones={milestones} />
      <ExerciseCard movement={movement} />
      <WeeklyChart week={week} goals={goals} />
      <CheatLogCard cheats={cheats} />

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">{user.email}</span>
        <div className="flex items-center gap-2">
          <GoalsDialog goals={goals} />
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
