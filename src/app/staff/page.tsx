import { PaymentStatus, Role } from "@prisma/client";
import { Check, ExternalLink, X } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/server/guards";
import { listAllBookings } from "@/server/services/booking-service";

import { reviewPaymentAction } from "./actions";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default async function StaffPage() {
  await requireRole([Role.STAFF, Role.SUPER_ADMIN]);
  const bookings = await listAllBookings();
  const pendingReviews = bookings.filter((booking) => booking.payment?.status === PaymentStatus.PENDING_REVIEW);
  const otherBookings = bookings.filter((booking) => booking.payment?.status !== PaymentStatus.PENDING_REVIEW).slice(0, 8);

  return (
    <div>
      <PageHeader
        eyebrow="Staff workspace"
        title="Payment review"
        description="Review uploaded proof, approve valid payments, and reject unclear or incorrect submissions."
      />

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{pendingReviews.length}</CardTitle>
            <CardDescription>Pending review</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{bookings.filter((booking) => booking.payment?.status === PaymentStatus.APPROVED).length}</CardTitle>
            <CardDescription>Approved payments</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{bookings.filter((booking) => booking.payment?.status === PaymentStatus.REJECTED).length}</CardTitle>
            <CardDescription>Rejected payments</CardDescription>
          </CardHeader>
        </Card>
      </section>

      <section className="space-y-4">
        {pendingReviews.map((booking) => (
          <Card key={booking.id}>
            <CardHeader>
              <CardTitle>
                <Link className="hover:text-primary" href={`/bookings/${booking.id}`}>
                  {booking.room.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {booking.member.fullName} / {booking.room.branch.name} / {formatDateTime(booking.startAt)} - {formatDateTime(booking.endAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium">{booking.totalPrice.toString()} THB</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Attendees</p>
                  <p className="font-medium">{booking.attendeeCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Booking status</p>
                  <StatusBadge status={booking.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Payment status</p>
                  {booking.payment ? <StatusBadge status={booking.payment.status} /> : <p className="font-medium">N/A</p>}
                </div>
              </div>

              {booking.payment?.proofFileUrl && (
                <a
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                  href={booking.payment.proofFileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open payment proof
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                <form action={reviewPaymentAction}>
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <input name="approved" type="hidden" value="true" />
                  <Button className="w-full" type="submit">
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                    Approve
                  </Button>
                </form>
                <form action={reviewPaymentAction} className="grid gap-3">
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <input name="approved" type="hidden" value="false" />
                  <div className="space-y-2">
                    <Label htmlFor={`reason-${booking.id}`}>Reject reason</Label>
                    <Input id={`reason-${booking.id}`} name="rejectionReason" placeholder="Invalid amount or unclear proof" required />
                  </div>
                  <Button className="w-full" type="submit" variant="secondary">
                    <X className="mr-2 h-4 w-4" aria-hidden="true" />
                    Reject
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingReviews.length === 0 && (
          <EmptyState title="No payments are waiting for review" description="New payment proof submissions will appear in this queue." />
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">Recent bookings</h2>
        <div className="space-y-3">
          {otherBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="grid gap-2 p-4 text-sm md:grid-cols-5">
                <Link className="font-medium hover:text-primary" href={`/bookings/${booking.id}`}>
                  {booking.room.name}
                </Link>
                <span>{booking.member.fullName}</span>
                <span>{formatDateTime(booking.startAt)}</span>
                <StatusBadge status={booking.status} />
                {booking.payment ? <StatusBadge status={booking.payment.status} /> : <span>N/A</span>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
