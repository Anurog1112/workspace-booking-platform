import { BookingStatus, PaymentStatus, Role } from "@prisma/client";
import { CreditCard, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

import { cancelBookingAction, submitPaymentProofAction } from "@/app/member/actions";
import { reviewPaymentAction } from "@/app/staff/actions";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/server/guards";
import { getBookingForProfile } from "@/server/services/booking-service";

type BookingDetailPageProps = {
  params: Promise<{ id: string }>;
};

const payableStatuses = new Set<BookingStatus>([BookingStatus.PENDING_PAYMENT, BookingStatus.REJECTED]);
const cancellableStatuses = new Set<BookingStatus>([BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_REVIEW]);
const reviewerRoles = new Set<Role>([Role.STAFF, Role.SUPER_ADMIN]);

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;
  const context = await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);
  const booking = await getBookingForProfile({ bookingId: id, profileId: context.profile.id, role: context.profile.role });

  if (!booking) {
    notFound();
  }

  const canReview = reviewerRoles.has(context.profile.role) && booking.payment?.status === PaymentStatus.PENDING_REVIEW;

  return (
    <div>
      <PageHeader
        eyebrow="Booking detail"
        title={booking.room.name}
        description={`${formatDateTime(booking.startAt)} - ${formatDateTime(booking.endAt)} / ${booking.room.branch.name}`}
        actions={<StatusBadge status={booking.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Booking status</p>
                <StatusBadge className="mt-2" status={booking.status} />
              </div>
              <div>
                <p className="text-muted-foreground">Payment status</p>
                {booking.payment ? <StatusBadge className="mt-2" status={booking.payment.status} /> : <p className="font-medium">N/A</p>}
              </div>
              <div>
                <p className="text-muted-foreground">Attendees</p>
                <p className="font-medium">{booking.attendeeCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium">{booking.totalPrice.toString()} THB</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment due</p>
                <p className="font-medium">{formatDateTime(booking.paymentDueAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Purpose</p>
                <p className="font-medium">{booking.purpose || "-"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Room</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">{booking.room.branch.name}</p>
              <p className="text-muted-foreground">{booking.room.description || "No description"}</p>
              <div className="flex flex-wrap gap-2">
                {booking.room.amenities.map(({ amenity }) => (
                  <span className="rounded-md border px-2 py-1 text-xs" key={amenity.id}>
                    {amenity.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment proof</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.payment?.proofFileUrl ? (
                <a className="inline-flex items-center gap-2 text-sm font-medium text-primary" href={booking.payment.proofFileUrl} rel="noreferrer" target="_blank">
                  Open uploaded proof
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">No proof uploaded yet.</p>
              )}

              {payableStatuses.has(booking.status) ? (
                <form action={submitPaymentProofAction} className="space-y-3" encType="multipart/form-data">
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <div className="space-y-2">
                    <Label htmlFor="proofFile">Upload proof</Label>
                    <Input accept="image/jpeg,image/png,image/webp,application/pdf" id="proofFile" name="proofFile" required type="file" />
                  </div>
                  <Button className="w-full gap-2" type="submit" variant="secondary">
                    <CreditCard className="h-4 w-4" aria-hidden="true" />
                    Submit proof
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          {cancellableStatuses.has(booking.status) ? (
            <Card>
              <CardHeader>
                <CardTitle>Cancel booking</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={cancelBookingAction}>
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <Button className="w-full" type="submit" variant="ghost">
                    Cancel pending booking
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {canReview ? (
            <Card>
              <CardHeader>
                <CardTitle>Staff review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={reviewPaymentAction}>
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <input name="approved" type="hidden" value="true" />
                  <Button className="w-full" type="submit">
                    Approve payment
                  </Button>
                </form>
                <form action={reviewPaymentAction} className="space-y-3">
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <input name="approved" type="hidden" value="false" />
                  <div className="space-y-2">
                    <Label htmlFor="rejectionReason">Reject reason</Label>
                    <Input id="rejectionReason" name="rejectionReason" required />
                  </div>
                  <Button className="w-full" type="submit" variant="secondary">
                    Reject payment
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
