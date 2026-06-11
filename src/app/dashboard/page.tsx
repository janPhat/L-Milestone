import { requireUser } from "@/lib/dal";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Real session enforcement (reaches D1) — not the optimistic middleware check.
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>L Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>.
            The tracker dashboard lands in Phase 6.
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </main>
  );
}
