import { Role } from "@prisma/client";
import { Check, ExternalLink, X } from "lucide-react";
import Link from "next/link";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { EmptyState } from "@/components/empty-state";
import { Notice } from "@/components/notice";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/server/guards";
import { listPendingReviewBookings } from "@/server/services/booking-service";

import { reviewPaymentAction } from "./actions";

type StaffPageProps = {
  searchParams?: Promise<{
    reviewed?: string;
    error?: string;
  }>;
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(date);
}

export default async function StaffPage({ searchParams }: StaffPageProps) {
  await requireRole([Role.STAFF, Role.SUPER_ADMIN]);
  const params = await searchParams;
  const pendingReviews = await listPendingReviewBookings();
  const notice = params?.error
    ? { type: "error" as const, message: decodeURIComponent(params.error) }
    : params?.reviewed
      ? { type: "success" as const, message: "Payment review updated." }
      : null;

  return (
    <div>
      <PageHeader
        eyebrow="Staff workspace"
        title="Payment review"
        description="Review uploaded proof, approve valid payments, and reject unclear or incorrect submissions."
      />

      {notice ? <Notice message={notice.message} type={notice.type} /> : null}

      <section className="mb-8 grid gap-4 md:grid-cols-[240px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{pendingReviews.length}</CardTitle>
            <CardDescription>Payments waiting for review</CardDescription>
          </CardHeader>
        </Card>
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-5 py-4">
          <div>
            <p className="font-semibold">Need to reserve a room for yourself?</p>
            <p className="mt-1 text-sm text-muted-foreground">Staff keep the same room search and personal booking tools as members.</p>
          </div>
          <Link className="inline-flex h-10 shrink-0 items-center rounded-md border px-4 text-sm font-semibold hover:bg-muted" href="/member">Book a room</Link>
        </div>
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
                  href={`/api/payment-proofs/${booking.id}`}
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
                  <ConfirmSubmitButton className="w-full" message="Approve this payment proof?">
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                    Approve
                  </ConfirmSubmitButton>
                </form>
                <form action={reviewPaymentAction} className="grid gap-3">
                  <input name="bookingId" type="hidden" value={booking.id} />
                  <input name="approved" type="hidden" value="false" />
                  <div className="space-y-2">
                    <Label htmlFor={`reason-${booking.id}`}>Reject reason</Label>
                    <Input id={`reason-${booking.id}`} name="rejectionReason" placeholder="Invalid amount or unclear proof" required />
                  </div>
                  <ConfirmSubmitButton className="w-full" message="Reject this payment proof?" variant="secondary">
                    <X className="mr-2 h-4 w-4" aria-hidden="true" />
                    Reject
                  </ConfirmSubmitButton>
                </form>
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingReviews.length === 0 && (
          <EmptyState title="No payments are waiting for review" description="New payment proof submissions will appear in this queue." />
        )}
      </section>

    </div>
  );
}
