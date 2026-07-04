import { BookingStatus, PaymentStatus, Role, RoomStatus } from "@prisma/client";
import { CalendarClock, DoorOpen, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const roleLinks = {
  [Role.MEMBER]: [{ href: "/member", label: "Member area", icon: CalendarClock }],
  [Role.STAFF]: [
    { href: "/member", label: "Member area", icon: CalendarClock },
    { href: "/staff", label: "Staff review", icon: ShieldCheck },
  ],
  [Role.SUPER_ADMIN]: [
    { href: "/member", label: "Member area", icon: CalendarClock },
    { href: "/staff", label: "Staff review", icon: ShieldCheck },
    { href: "/admin", label: "Admin rooms", icon: DoorOpen },
  ],
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role ?? Role.MEMBER;
  const [activeRooms, pendingPayments, confirmedBookings] = await Promise.all([
    prisma.room.count({ where: { status: RoomStatus.ACTIVE } }),
    prisma.payment.count({ where: { status: PaymentStatus.PENDING_REVIEW } }),
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-8">
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">Signed in as {session.user.email}</p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Role: {role}</p>
      </div>
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{activeRooms}</CardTitle>
            <CardDescription>Active rooms</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{pendingPayments}</CardTitle>
            <CardDescription>Payments pending review</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{confirmedBookings}</CardTitle>
            <CardDescription>Confirmed bookings</CardDescription>
          </CardHeader>
        </Card>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {roleLinks[role].map((item) => (
          <Link href={item.href} key={item.href}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle>{item.label}</CardTitle>
                <CardDescription>Protected by middleware and server role checks.</CardDescription>
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
