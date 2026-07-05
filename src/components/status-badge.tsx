import { BookingStatus, PaymentStatus, Role, RoomStatus } from "@prisma/client";

import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: BookingStatus | PaymentStatus | Role | RoomStatus | string;
  className?: string;
};

const statusClasses: Record<string, string> = {
  [BookingStatus.PENDING_PAYMENT]: "border-amber-200 bg-amber-50 text-amber-700",
  [BookingStatus.PENDING_REVIEW]: "border-yellow-200 bg-yellow-50 text-yellow-700",
  [BookingStatus.CONFIRMED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [BookingStatus.REJECTED]: "border-red-200 bg-red-50 text-red-700",
  [BookingStatus.CANCELLED]: "border-slate-200 bg-slate-100 text-slate-600",
  [BookingStatus.COMPLETED]: "border-blue-200 bg-blue-50 text-blue-700",
  [BookingStatus.EXPIRED]: "border-slate-200 bg-slate-100 text-slate-600",
  [PaymentStatus.WAITING_UPLOAD]: "border-amber-200 bg-amber-50 text-amber-700",
  [PaymentStatus.APPROVED]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [RoomStatus.ACTIVE]: "border-emerald-200 bg-emerald-50 text-emerald-700",
  [RoomStatus.MAINTENANCE]: "border-orange-200 bg-orange-50 text-orange-700",
  [RoomStatus.INACTIVE]: "border-slate-200 bg-slate-100 text-slate-600",
  [Role.SUPER_ADMIN]: "border-violet-200 bg-violet-50 text-violet-700",
  [Role.STAFF]: "border-blue-200 bg-blue-50 text-blue-700",
  [Role.MEMBER]: "border-teal-200 bg-teal-50 text-teal-700",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold",
        statusClasses[status] ?? "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
