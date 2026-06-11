import { getDashboardData } from "@/lib/tracker-data";
import { SignOutButton } from "@/components/sign-out-button";
import { QuickAddWater } from "@/components/quick-add-water";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// getDashboardData() runs requireUser() (real session check against D1) and the
// Phase-4 summaries over the user's D1 rows. The Phase-6 UI builds on this.
export default async function DashboardPage() {
  const { user, day, goals, milestones } = await getDashboardData();
  const waterPct = Math.round(day.waterProgress * 100);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
          <CardDescription>{day.date}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            Water: <span className="font-medium">{day.waterML}</span> / {goals.waterML} ml ({waterPct}%)
          </p>
          <p className="text-sm">
            Glasses: <span className="font-medium">{milestones.completedGlasses}</span> /{" "}
            {milestones.totalGlasses}
          </p>
          <p className="text-sm">
            Exercise: <span className="font-medium">{day.exerciseMinutes}</span> /{" "}
            {goals.exerciseMinutes} min
          </p>
          <p className="text-sm text-muted-foreground">{day.nextNudge}</p>
          <QuickAddWater />
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <SignOutButton />
      </div>
    </main>
  );
}
