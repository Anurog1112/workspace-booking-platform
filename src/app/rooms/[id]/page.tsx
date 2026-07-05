import { Role } from "@prisma/client";
import { CalendarPlus, Clock, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createBookingAction } from "@/app/member/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RoomVisual } from "@/components/room-visual";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import { buildHourlyTimeOptions, formatBranchTime } from "@/lib/branch-time";
import { listUpcomingBookingsForRoom } from "@/server/services/booking-service";
import { getRoomById } from "@/server/services/room-service";

type RoomDetailPageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

function getDefaultBookingDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return date.toISOString().slice(0, 10);
}

export default async function RoomDetailPage({ params }: RoomDetailPageProps) {
  const { id } = await params;
  const [room, bookings, session] = await Promise.all([getRoomById(id), listUpcomingBookingsForRoom(id), auth()]);

  if (!room) {
    notFound();
  }

  const canBook = Boolean(session?.user?.role && [Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN].includes(session.user.role));

  return (
    <div>
      <PageHeader
        eyebrow={room.branch.name}
        title={room.name}
        description={room.description ?? "Review room details, capacity, amenities, and reserved time ranges before booking."}
        actions={<StatusBadge status={room.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <Card className="overflow-hidden">
            <div className="aspect-[16/7] w-full">
              <RoomVisual imageUrl={room.imageUrl} name={room.name} />
            </div>
            <CardHeader>
              <CardTitle>Room details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-3">
              <div className="rounded-md bg-muted p-4">
                <Users className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
                <p className="text-muted-foreground">Capacity</p>
                <p className="font-semibold">{room.capacity} seats</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <Clock className="mb-2 h-5 w-5 text-primary" aria-hidden="true" />
                <p className="text-muted-foreground">Rate</p>
                <p className="font-semibold">{room.hourlyRate.toString()} THB/hour</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-muted-foreground">Branch</p>
                <p className="font-semibold">{room.branch.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open {formatBranchTime(room.branch.openingTime)} - {formatBranchTime(room.branch.closingTime)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Amenities</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {room.amenities.map(({ amenity }) => (
                <span className="rounded-md border px-3 py-2 text-sm" key={amenity.id}>
                  {amenity.name}
                </span>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reserved time ranges</CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <EmptyState title="No blocking bookings" description="This room has no confirmed or pending-review bookings in the upcoming schedule." />
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm md:flex-row md:items-center md:justify-between" key={booking.id}>
                      <span>
                        {formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}
                      </span>
                      <StatusBadge status={booking.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <aside>
          <Card>
            <CardHeader>
              <CardTitle>Book this room</CardTitle>
            </CardHeader>
            <CardContent>
              {canBook ? (
                <form action={createBookingAction} className="space-y-4">
                  <input name="roomId" type="hidden" value={room.id} />
                  <div className="space-y-2">
                    <Label htmlFor="bookingDate">Date</Label>
                    <Input defaultValue={getDefaultBookingDate()} id="bookingDate" name="bookingDate" required type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" defaultValue="09:00" id="startTime" name="startTime" required>
                      {buildHourlyTimeOptions(room.branch.openingTime, room.branch.closingTime)
                        .slice(0, -1)
                        .map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End</Label>
                    <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" defaultValue="10:00" id="endTime" name="endTime" required>
                      {buildHourlyTimeOptions(room.branch.openingTime, room.branch.closingTime)
                        .slice(1)
                        .map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="attendeeCount">Attendees</Label>
                    <Input id="attendeeCount" max={room.capacity} min="1" name="attendeeCount" required type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose</Label>
                    <Input id="purpose" name="purpose" placeholder="Project meeting" />
                  </div>
                  <Button className="w-full gap-2" type="submit">
                    <CalendarPlus className="h-4 w-4" aria-hidden="true" />
                    Book room
                  </Button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Sign in before creating a booking.</p>
                  <Link
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-teal-800"
                    href="/login"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
