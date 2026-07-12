import { Role } from "@prisma/client";
import { DoorOpen } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { RoomSearchForm } from "@/components/room-search-form";
import { RoomVisual } from "@/components/room-visual";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { combineBranchDateTime, formatBranchTime } from "@/lib/branch-time";
import { requireRole } from "@/server/guards";
import { listBranchOptions, listRooms } from "@/server/services/room-service";
import { roomSearchSchema } from "@/server/validators/room";

type MemberSearchParams = Promise<{
  branchId?: string;
  capacity?: string;
  startAt?: string;
  endAt?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
}>;

function getDefaultBookingDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);

  return date.toISOString().slice(0, 10);
}

function buildDateRange(params: Awaited<MemberSearchParams>) {
  if (params.bookingDate && params.startTime && params.endTime) {
    return {
      startAt: combineBranchDateTime(params.bookingDate, params.startTime),
      endAt: combineBranchDateTime(params.bookingDate, params.endTime),
    };
  }

  return { startAt: params.startAt, endAt: params.endAt };
}

function getSearchTimeOptions() {
  return Array.from({ length: 13 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);
}

export default async function MemberPage({ searchParams }: { searchParams: MemberSearchParams }) {
  await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  const params = await searchParams;
  const dateRange = buildDateRange(params);
  const parsedFilters = roomSearchSchema.safeParse({
    branchId: params.branchId || undefined,
    capacity: params.capacity || undefined,
    startAt: dateRange.startAt || undefined,
    endAt: dateRange.endAt || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};
  const [branches, rooms] = await Promise.all([listBranchOptions(), listRooms(filters)]);
  const defaultBookingDate = params.bookingDate ?? getDefaultBookingDate();
  const searchTimeOptions = getSearchTimeOptions();

  return (
    <div>
      <PageHeader
        eyebrow="Member workspace"
        title="Find and book a room"
        description="Choose your group size and time first. Only rooms that are available for the full period are shown."
        actions={
          <Link className="inline-flex h-10 items-center rounded-md border bg-card px-4 text-sm font-semibold hover:bg-muted" href="/member/bookings">
            My bookings
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search availability</CardTitle>
          <CardDescription>All times use the branch&apos;s local opening hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <RoomSearchForm
            branches={branches.map(({ id, name }) => ({ id, name }))}
            defaults={{
              branchId: params.branchId ?? "",
              capacity: params.capacity ?? "1",
              bookingDate: defaultBookingDate,
              startTime: params.startTime ?? "09:00",
              endTime: params.endTime ?? "10:00",
            }}
            timeOptions={searchTimeOptions}
          />
        </CardContent>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2">
        {rooms.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState
              icon={<DoorOpen className="h-10 w-10" aria-hidden="true" />}
              title="No rooms match your search"
              description="Try a different time range, branch, or attendee count."
            />
          </div>
        ) : (
          rooms.map((room) => {
            const bookingUrl = `/rooms/${room.id}?bookingDate=${defaultBookingDate}&startTime=${params.startTime ?? "09:00"}&endTime=${params.endTime ?? "10:00"}`;

            return (
              <Card className="overflow-hidden" key={room.id}>
                <div className="aspect-[16/7] w-full">
                  <RoomVisual imageUrl={room.imageUrl} name={room.name} />
                </div>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>{room.name}</CardTitle>
                    <CardDescription>{room.branch.name} / {room.capacity} seats</CardDescription>
                  </div>
                  <span className="text-sm font-semibold">{room.hourlyRate.toString()} THB/hr</span>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p>{room.description || "Ready for booking."}</p>
                    <p>Open {formatBranchTime(room.branch.openingTime)} - {formatBranchTime(room.branch.closingTime)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map(({ amenity }) => (
                      <span className="rounded-md border px-2 py-1 text-xs" key={amenity.id}>{amenity.name}</span>
                    ))}
                  </div>
                  <Link className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-teal-800" href={bookingUrl}>
                    View room and book
                  </Link>
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
