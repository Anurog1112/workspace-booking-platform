import { BookingStatus, Role } from "@prisma/client";
import { CreditCard, DoorOpen } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { RoomVisual } from "@/components/room-visual";
import { RoomSearchForm } from "@/components/room-search-form";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { combineBranchDateTime, formatBranchTime } from "@/lib/branch-time";
import { requireRole } from "@/server/guards";
import { listBookingsForMember } from "@/server/services/booking-service";
import { listBranches, listRooms } from "@/server/services/room-service";
import { roomSearchSchema } from "@/server/validators/room";

import { cancelBookingAction, submitPaymentProofAction } from "./actions";

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
  const [branches, rooms, bookings] = await Promise.all([listBranches(), listRooms(filters), listBookingsForMember(context.profile.id, 12)]);
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
          <CardTitle>Search availability</CardTitle>
          <CardDescription>Choose your group size and time first. Only available rooms will be shown.</CardDescription>
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
                  <Link className="text-sm font-medium text-primary" href={`/rooms/${room.id}?bookingDate=${defaultBookingDate}&startTime=${params.startTime ?? "09:00"}&endTime=${params.endTime ?? "10:00"}`}>
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
                  <Link
                    className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-teal-800"
                    href={`/rooms/${room.id}?bookingDate=${defaultBookingDate}&startTime=${params.startTime ?? "09:00"}&endTime=${params.endTime ?? "10:00"}`}
                  >
                    Choose this room
                  </Link>
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
                      <SubmitButton className="w-full" pendingLabel="Uploading proof..." variant="secondary">
                        <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
                        Submit proof
                      </SubmitButton>
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
