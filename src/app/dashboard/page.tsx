import { Role } from "@prisma/client";
import { CalendarCheck2, CalendarClock, CreditCard, DoorOpen, ShieldCheck, UserCog, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getAdminDashboard, getMemberDashboard, getStaffDashboard } from "@/server/services/dashboard-service";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function MetricCard({ icon: Icon, value, label, tone = "text-primary" }: { icon: typeof DoorOpen; value: number; label: string; tone?: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-3xl">{value}</CardTitle>
          <Icon className={`h-5 w-5 ${tone}`} aria-hidden="true" />
        </div>
        <CardDescription>{label}</CardDescription>
      </CardHeader>
    </Card>
  );
}

async function MemberDashboard({ profileId }: { profileId: string }) {
  const data = await getMemberDashboard(profileId);

  return (
    <>
      <PageHeader
        eyebrow="Member home"
        title="Ready for your next session?"
        description="Find an available room, keep track of upcoming bookings, and complete any payment steps."
        actions={
          <Link className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-teal-800" href="/member">
            Find a room
          </Link>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={DoorOpen} label="Rooms available to browse" value={data.activeRooms} />
        <MetricCard icon={CalendarCheck2} label="Upcoming active bookings" tone="text-emerald-600" value={data.upcomingBookings} />
        <MetricCard icon={CreditCard} label="Payments needing your action" tone="text-amber-600" value={data.paymentActions} />
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Next booking</CardTitle>
            <CardDescription>Your closest active reservation.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.nextBooking ? (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{data.nextBooking.room.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(data.nextBooking.startAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={data.nextBooking.status} />
                  <Link className="text-sm font-semibold text-primary" href={`/bookings/${data.nextBooking.id}`}>
                    View details
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState title="No upcoming booking" description="Choose a room and reserve a time that works for you." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick action</CardTitle>
            <CardDescription>Search availability before choosing a room.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-card px-4 text-sm font-semibold hover:bg-muted" href="/member">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              Search rooms
            </Link>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

async function StaffDashboard() {
  const data = await getStaffDashboard();

  return (
    <>
      <PageHeader
        eyebrow="Staff operations"
        title="Today at the workspace"
        description="Start with payment reviews, then prepare for confirmed arrivals and check-ins."
        actions={
          <div className="flex gap-2">
            <Link className="inline-flex h-10 items-center rounded-md border bg-card px-4 text-sm font-semibold hover:bg-muted" href="/member">Book a room</Link>
            <Link className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-teal-800" href="/staff">Open review queue</Link>
          </div>
        }
      />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={ShieldCheck} label="Payments waiting for review" tone="text-amber-600" value={data.pendingReviews} />
        <MetricCard icon={CalendarCheck2} label="Confirmed bookings today" tone="text-emerald-600" value={data.confirmedToday} />
        <MetricCard icon={Users} label="Completed check-ins today" tone="text-blue-600" value={data.checkinsToday} />
      </section>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Next arrivals</CardTitle>
          <CardDescription>The next five confirmed bookings across all rooms.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.nextArrivals.length ? data.nextArrivals.map((booking) => (
            <Link className="grid gap-2 rounded-md border p-4 text-sm hover:bg-muted sm:grid-cols-[1fr_1fr_auto] sm:items-center" href={`/bookings/${booking.id}`} key={booking.id}>
              <span className="font-semibold">{booking.room.name}</span>
              <span className="text-muted-foreground">{booking.member.fullName}</span>
              <span>{formatDateTime(booking.startAt)}</span>
            </Link>
          )) : <EmptyState title="No confirmed arrivals" description="Confirmed bookings will appear here." />}
        </CardContent>
      </Card>
    </>
  );
}

async function AdminDashboard() {
  const data = await getAdminDashboard();

  return (
    <>
      <PageHeader
        eyebrow="Super admin overview"
        title="Workspace performance"
        description="Monitor inventory, users, bookings, and the staff payment workload from one place."
        actions={<StatusBadge status={Role.SUPER_ADMIN} />}
      />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={DoorOpen} label="Active rooms" value={data.activeRooms} />
        <MetricCard icon={CalendarCheck2} label="All bookings" tone="text-blue-600" value={data.totalBookings} />
        <MetricCard icon={UserCog} label="Registered users" tone="text-violet-600" value={data.users} />
        <MetricCard icon={ShieldCheck} label="Pending payment reviews" tone="text-amber-600" value={data.pendingReviews} />
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <Link className="rounded-lg border bg-card p-5 hover:border-primary hover:bg-muted" href="/admin">
          <DoorOpen className="h-5 w-5 text-primary" aria-hidden="true" />
          <p className="mt-3 font-semibold">Manage rooms</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.unavailableRooms} room(s) unavailable</p>
        </Link>
        <Link className="rounded-lg border bg-card p-5 hover:border-primary hover:bg-muted" href="/admin/users">
          <UserCog className="h-5 w-5 text-violet-600" aria-hidden="true" />
          <p className="mt-3 font-semibold">Manage users and roles</p>
          <p className="mt-1 text-sm text-muted-foreground">Control staff and member permissions</p>
        </Link>
        <Link className="rounded-lg border bg-card p-5 hover:border-primary hover:bg-muted" href="/staff">
          <ShieldCheck className="h-5 w-5 text-amber-600" aria-hidden="true" />
          <p className="mt-3 font-semibold">Staff review queue</p>
          <p className="mt-1 text-sm text-muted-foreground">{data.confirmedBookings} confirmed booking(s)</p>
        </Link>
      </section>
    </>
  );
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.profileId || !session.user.role) {
    redirect("/login");
  }

  if (session.user.role === Role.SUPER_ADMIN) {
    return <AdminDashboard />;
  }

  if (session.user.role === Role.STAFF) {
    return <StaffDashboard />;
  }

  return <MemberDashboard profileId={session.user.profileId} />;
}
