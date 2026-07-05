import { BookingStatus, PaymentStatus } from "@prisma/client";
import { CheckCircle2, Circle, CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type BookingTimelineProps = {
  bookingStatus: BookingStatus;
  paymentStatus?: PaymentStatus;
};

const steps = [
  { key: "created", label: "Booking created" },
  { key: "payment", label: "Payment proof" },
  { key: "review", label: "Staff review" },
  { key: "confirmed", label: "Confirmed" },
];

const failedStatuses: BookingStatus[] = [BookingStatus.REJECTED, BookingStatus.CANCELLED, BookingStatus.EXPIRED];

function getCurrentStep(bookingStatus: BookingStatus, paymentStatus?: PaymentStatus) {
  if (failedStatuses.includes(bookingStatus)) {
    return 2;
  }

  if (bookingStatus === BookingStatus.CONFIRMED || bookingStatus === BookingStatus.COMPLETED) {
    return 3;
  }

  if (bookingStatus === BookingStatus.PENDING_REVIEW || paymentStatus === PaymentStatus.PENDING_REVIEW) {
    return 2;
  }

  if (bookingStatus === BookingStatus.PENDING_PAYMENT) {
    return 1;
  }

  return 0;
}

export function BookingTimeline({ bookingStatus, paymentStatus }: BookingTimelineProps) {
  const currentStep = getCurrentStep(bookingStatus, paymentStatus);
  const failed = failedStatuses.includes(bookingStatus);

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const done = index < currentStep || (!failed && index === currentStep && currentStep === steps.length - 1);
        const active = index === currentStep;
        const Icon = failed && active ? CircleAlert : done ? CheckCircle2 : Circle;

        return (
          <div className="flex items-start gap-3 rounded-md border bg-card p-3" key={step.key}>
            <Icon
              className={cn(
                "mt-0.5 h-5 w-5",
                failed && active ? "text-red-600" : done || active ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">{step.label}</p>
              <p className="text-xs text-muted-foreground">{active ? bookingStatus.replaceAll("_", " ") : done ? "Completed" : "Waiting"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
