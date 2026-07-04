import { CalendarClock, DoorOpen, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";

const roleLinks = [
  { href: "/member", label: "Member area", icon: CalendarClock },
  { href: "/staff", label: "Staff review", icon: ShieldCheck },
  { href: "/admin", label: "Admin rooms", icon: DoorOpen },
];

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Signed in as {session.user.email}</p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Role: {session.user.role ?? "MEMBER"}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {roleLinks.map((item) => (
          <Link href={item.href} key={item.href}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>Protected by middleware and server session checks.</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="text-sm font-medium text-primary">Open</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
