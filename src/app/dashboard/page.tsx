import { BookingStatus, PaymentStatus, Role, RoomStatus } from "@prisma/client";
import { CalendarClock, DoorOpen, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardChart } from "@/components/dashboard-chart";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { demoBookings, demoRooms, isDemoMode } from "@/lib/demo-mode";
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
  const [activeRooms, pendingPayments, confirmedBookings] = isDemoMode
    ? [
        demoRooms.filter((room) => room.status === RoomStatus.ACTIVE).length,
        demoBookings.filter((booking) => booking.payment?.status === PaymentStatus.PENDING_REVIEW).length,
        demoBookings.filter((booking) => booking.status === BookingStatus.CONFIRMED).length,
      ]
    : await Promise.all([
        prisma.room.count({ where: { status: RoomStatus.ACTIVE } }),
        prisma.payment.count({ where: { status: PaymentStatus.PENDING_REVIEW } }),
        prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Workspace overview"
        title="Dashboard"
        description={`Signed in as ${session.user.email}`}
        actions={<StatusBadge status={role} />}
      />
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              {activeRooms}
            </CardTitle>
            <CardDescription>Active rooms</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" aria-hidden="true" />
              {pendingPayments}
            </CardTitle>
            <CardDescription>Payments pending review</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              {confirmedBookings}
            </CardTitle>
            <CardDescription>Confirmed bookings</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Operational snapshot</CardTitle>
            <CardDescription>Quick comparison of room capacity and payment workload.</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart
              items={[
                { label: "Rooms", value: activeRooms },
                { label: "Review", value: pendingPayments },
                { label: "Confirmed", value: confirmedBookings },
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Next action</CardTitle>
            <CardDescription>Open the workspace that matches your current role.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-teal-800"
              href={roleLinks[role][roleLinks[role].length - 1].href}
            >
              Continue
            </Link>
          </CardContent>
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
    </div>
  );
}
