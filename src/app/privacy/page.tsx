import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Privacy · L Health",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-md space-y-4 p-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Privacy</CardTitle>
          <CardDescription>How L Health handles your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground">What we store.</span> Your account
            (name, email) and the things you log — water, exercise, body stats
            (weight, waist), and cheat entries — plus your goals and time zone.
          </p>
          <p>
            <span className="text-foreground">Where.</span> In a Cloudflare D1
            database. Each row is tied to your account, and every request only
            ever reads or writes your own data.
          </p>
          <p>
            <span className="text-foreground">How it&apos;s used.</span> Only to
            show you your dashboard. We don&apos;t sell it, show ads, or share it
            with third parties. Sign-up is invite-only.
          </p>
          <p>
            <span className="text-foreground">Your control.</span> You can{" "}
            <span className="text-foreground">export</span> all of your data as
            JSON, or <span className="text-foreground">delete your account</span>{" "}
            and everything in it, at any time from the Account menu. Deletion is
            immediate and permanent.
          </p>
          <p className="pt-2">
            <Link href="/dashboard" className="text-foreground underline">
              Back to dashboard
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
