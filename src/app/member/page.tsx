import { BookingStatus, Role } from "@prisma/client";
import { CalendarPlus, CreditCard, Search, DoorOpen } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { RoomVisual } from "@/components/room-visual";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildHourlyTimeOptions, combineBranchDateTime, formatBranchTime } from "@/lib/branch-time";
import { requireRole } from "@/server/guards";
import { listBookingsForMember } from "@/server/services/booking-service";
import { listBranches, listRooms } from "@/server/services/room-service";
import { roomSearchSchema } from "@/server/validators/room";

import { cancelBookingAction, createBookingAction, submitPaymentProofAction } from "./actions";

type MemberSearchParams = Promise<{
  branchId?: string;
  capacity?: string;
  startAt?: string;
  endAt?: string;
  bookingDate?: string;
  startTime?: string;
  endTime?: string;
  created?: string;
  paymentSubmitted?: string;
  cancelled?: string;
  error?: string;
}>;

const payableStatuses = new Set<BookingStatus>([BookingStatus.PENDING_PAYMENT, BookingStatus.REJECTED]);
const cancellableStatuses = new Set<BookingStatus>([BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_REVIEW]);

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

function buildDateRange(params: Awaited<MemberSearchParams>) {
  if (params.bookingDate && params.startTime && params.endTime) {
    return {
      startAt: combineBranchDateTime(params.bookingDate, params.startTime),
      endAt: combineBranchDateTime(params.bookingDate, params.endTime),
    };
  }

  return {
    startAt: params.startAt,
    endAt: params.endAt,
  };
}

function getSearchTimeOptions() {
  return Array.from({ length: 13 }, (_, index) => `${String(index + 8).padStart(2, "0")}:00`);
}

export default async function MemberPage({ searchParams }: { searchParams: MemberSearchParams }) {
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  const params = await searchParams;
  const dateRange = buildDateRange(params);
  const parsedFilters = roomSearchSchema.safeParse({
    branchId: params.branchId || undefined,
    capacity: params.capacity || undefined,
    startAt: dateRange.startAt || undefined,
    endAt: dateRange.endAt || undefined,
  });
  const filters = parsedFilters.success ? parsedFilters.data : {};
  const [branches, rooms, bookings] = await Promise.all([listBranches(), listRooms(filters), listBookingsForMember(context.profile.id)]);
  const defaultBookingDate = params.bookingDate ?? getDefaultBookingDate();
  const searchTimeOptions = getSearchTimeOptions();
  const notice = params.error
    ? { type: "error" as const, message: decodeURIComponent(params.error) }
    : params.created
      ? { type: "success" as const, message: "Booking created. Please submit payment proof before the deadline." }
      : params.paymentSubmitted
        ? { type: "success" as const, message: "Payment proof submitted for staff review." }
        : params.cancelled
          ? { type: "info" as const, message: "Booking cancelled." }
          : null;

  return (
    <div>
      <PageHeader
        eyebrow="Member workspace"
        title="Find and book a room"
        description="Search by branch, capacity, and time range. Confirmed and pending-review bookings are blocked from availability."
      />

      {notice ? <Notice message={notice.message} type={notice.type} /> : null}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" aria-hidden="true" />
            Search availability
          </CardTitle>
          <CardDescription>Filtering by time also excludes rooms with blocking bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-6" method="get">
            <div className="space-y-2">
              <Label htmlFor="branchId">Branch</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                defaultValue={params.branchId ?? ""}
                id="branchId"
                name="branchId"
              >
                <option value="">All</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Seats</Label>
              <Input defaultValue={params.capacity} id="capacity" min="1" name="capacity" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingDate">Date</Label>
              <Input defaultValue={defaultBookingDate} id="bookingDate" name="bookingDate" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start</Label>
              <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" defaultValue={params.startTime ?? "09:00"} id="startTime" name="startTime">
                {searchTimeOptions.slice(0, -1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End</Label>
              <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" defaultValue={params.endTime ?? "10:00"} id="endTime" name="endTime">
                {searchTimeOptions.slice(1).map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button className="w-full" type="submit">
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          {rooms.length === 0 ? (
            <EmptyState
              icon={<DoorOpen className="h-10 w-10" aria-hidden="true" />}
              title="No rooms match your search"
              description="Try a different time range, branch, or attendee count."
            />
          ) : (
            rooms.map((room) => (
              <Card className="overflow-hidden" key={room.id}>
                <div className="aspect-[16/7] w-full">
                  <RoomVisual imageUrl={room.imageUrl} name={room.name} />
                </div>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>{room.name}</CardTitle>
                    <CardDescription>
                      {room.branch.name} / {room.capacity} seats / {room.hourlyRate.toString()} THB/hour
                    </CardDescription>
                  </div>
                  <Link className="text-sm font-medium text-primary" href={`/rooms/${room.id}`}>
                    Details
                  </Link>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <p>{room.description || "Ready for booking."}</p>
                    <p>
                      Open {formatBranchTime(room.branch.openingTime)} - {formatBranchTime(room.branch.closingTime)}
                    </p>
                    <p>{room.hourlyRate.toString()} THB/hour</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map(({ amenity }) => (
                      <span className="rounded-md border px-2 py-1 text-xs" key={amenity.id}>
                        {amenity.name}
                      </span>
                    ))}
                  </div>
                  <form action={createBookingAction} className="grid gap-3 md:grid-cols-2">
                    <input name="roomId" type="hidden" value={room.id} />
                    <div className="space-y-2">
                      <Label htmlFor={`booking-date-${room.id}`}>Date</Label>
                      <Input defaultValue={defaultBookingDate} id={`booking-date-${room.id}`} name="bookingDate" required type="date" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`attendee-${room.id}`}>Attendees</Label>
                      <Input id={`attendee-${room.id}`} max={room.capacity} min="1" name="attendeeCount" required type="number" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`booking-start-${room.id}`}>Start</Label>
                      <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" defaultValue={params.startTime ?? "09:00"} id={`booking-start-${room.id}`} name="startTime" required>
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
                      <Label htmlFor={`booking-end-${room.id}`}>End</Label>
                      <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" defaultValue={params.endTime ?? "10:00"} id={`booking-end-${room.id}`} name="endTime" required>
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
                      <Label htmlFor={`purpose-${room.id}`}>Purpose</Label>
                      <Input id={`purpose-${room.id}`} name="purpose" placeholder="Workshop, client meeting" />
                    </div>
                    <Button className="md:col-span-2" type="submit">
                      <CalendarPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Book room
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ))
          )}
        </section>

        <aside className="space-y-4">
          <h2 className="text-xl font-semibold">My bookings</h2>
          {bookings.length === 0 ? (
            <EmptyState title="No bookings yet" description="Search for a room and create your first booking." />
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <CardTitle className="text-base">
                    <Link className="hover:text-primary" href={`/bookings/${booking.id}`}>
                      {booking.room.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={booking.status} />
                    <span className="text-muted-foreground">Payment</span>
                    {booking.payment ? <StatusBadge status={booking.payment.status} /> : <span className="font-medium">N/A</span>}
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{booking.totalPrice.toString()} THB</span>
                    <span className="text-muted-foreground">Due</span>
                    <span className="font-medium">{formatDateTime(booking.paymentDueAt)}</span>
                  </div>

                  {payableStatuses.has(booking.status) && (
                    <form action={submitPaymentProofAction} className="space-y-3" encType="multipart/form-data">
                      <input name="bookingId" type="hidden" value={booking.id} />
                      <div className="space-y-2">
                        <Label htmlFor={`proof-${booking.id}`}>Payment proof</Label>
                        <Input accept="image/jpeg,image/png,image/webp,application/pdf" id={`proof-${booking.id}`} name="proofFile" required type="file" />
                      </div>
                      <Button className="w-full" type="submit" variant="secondary">
                        <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                        Submit proof
                      </Button>
                    </form>
                  )}

                  {cancellableStatuses.has(booking.status) && (
                    <form action={cancelBookingAction}>
                      <input name="bookingId" type="hidden" value={booking.id} />
                      <ConfirmSubmitButton className="w-full" message="Cancel this pending booking?" variant="ghost">
                        Cancel booking
                      </ConfirmSubmitButton>
                    </form>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}
