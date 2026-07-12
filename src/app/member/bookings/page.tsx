import { BookingStatus, Role } from "@prisma/client";
import { CreditCard } from "lucide-react";
import Link from "next/link";

import { cancelBookingAction, submitPaymentProofAction } from "@/app/member/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EmptyState } from "@/components/empty-state";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/server/guards";
import { listBookingsForMember } from "@/server/services/booking-service";

type BookingListSearchParams = Promise<{ paymentSubmitted?: string; cancelled?: string; error?: string }>;

const payableStatuses = new Set<BookingStatus>([BookingStatus.PENDING_PAYMENT, BookingStatus.REJECTED]);
const cancellableStatuses = new Set<BookingStatus>([BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_REVIEW]);

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default async function MemberBookingsPage({ searchParams }: { searchParams: BookingListSearchParams }) {
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  const [params, bookings] = await Promise.all([searchParams, listBookingsForMember(context.profile.id, 20)]);
  const notice = params.error
    ? { type: "error" as const, message: decodeURIComponent(params.error) }
    : params.paymentSubmitted
      ? { type: "success" as const, message: "Payment proof submitted for staff review." }
      : params.cancelled
        ? { type: "info" as const, message: "Booking cancelled." }
        : null;

  return (
    <div>
      <PageHeader
        eyebrow="Member workspace"
        title="My bookings"
        description="Track booking and payment status, submit proof, or cancel a pending reservation."
        actions={<Link className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-teal-800" href="/member">Find another room</Link>}
      />
      {notice ? <Notice message={notice.message} type={notice.type} /> : null}
      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet" description="Search for a room and create your first booking." />
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base"><Link className="hover:text-primary" href={`/bookings/${booking.id}`}>{booking.room.name}</Link></CardTitle>
                  <CardDescription>{formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}</CardDescription>
                </div>
                <StatusBadge status={booking.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  {booking.payment ? <StatusBadge status={booking.payment.status} /> : <span className="font-medium">N/A</span>}
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{booking.totalPrice.toString()} THB</span>
                  <span className="text-muted-foreground">Payment due</span>
                  <span className="font-medium">{formatDateTime(booking.paymentDueAt)}</span>
                </div>
                {payableStatuses.has(booking.status) ? (
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
                ) : null}
                {cancellableStatuses.has(booking.status) ? (
                  <form action={cancelBookingAction}>
                    <input name="bookingId" type="hidden" value={booking.id} />
                    <ConfirmSubmitButton className="w-full" message="Cancel this pending booking?" variant="ghost">Cancel booking</ConfirmSubmitButton>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
