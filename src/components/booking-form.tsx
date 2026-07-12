"use client";

import { CalendarCheck2, CalendarPlus, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useActionState, useEffect, useMemo, useRef, useState } from "react";

import {
  createBookingAction,
  type CreateBookingActionState,
} from "@/app/member/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BookingFormProps = {
  roomId: string;
  roomName: string;
  capacity: number;
  hourlyRate: number;
  timeOptions: string[];
  defaultDate: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
};

type ClientErrors = Partial<Record<"bookingDate" | "startTime" | "endTime" | "attendeeCount", string>>;
const initialCreateBookingState: CreateBookingActionState = { status: "idle" };

export function BookingForm({
  roomId,
  roomName,
  capacity,
  hourlyRate,
  timeOptions,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
}: BookingFormProps) {
  const router = useRouter();
  const refreshedBookingId = useRef<string | null>(null);
  const [state, formAction, pending] = useActionState(createBookingAction, initialCreateBookingState);
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [startTime, setStartTime] = useState(defaultStartTime && timeOptions.includes(defaultStartTime) ? defaultStartTime : timeOptions[0]);
  const [endTime, setEndTime] = useState(defaultEndTime && timeOptions.includes(defaultEndTime) ? defaultEndTime : timeOptions[1]);

  const estimatedPrice = useMemo(() => {
    const startIndex = timeOptions.indexOf(startTime);
    const endIndex = timeOptions.indexOf(endTime);
    return endIndex > startIndex ? (endIndex - startIndex) * hourlyRate : 0;
  }, [endTime, hourlyRate, startTime, timeOptions]);

  useEffect(() => {
    if (state.status === "success" && state.bookingId && refreshedBookingId.current !== state.bookingId) {
      refreshedBookingId.current = state.bookingId;
      setShowSuccess(true);
      router.refresh();
    }
  }, [router, state.bookingId, state.status]);

  function validate(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const bookingDate = String(formData.get("bookingDate") ?? "");
    const attendeeCount = Number(formData.get("attendeeCount"));
    const nextErrors: ClientErrors = {};

    if (!bookingDate) {
      nextErrors.bookingDate = "Please select a booking date.";
    }

    if (!startTime) {
      nextErrors.startTime = "Please select a start time.";
    }

    if (!endTime) {
      nextErrors.endTime = "Please select an end time.";
    } else if (timeOptions.indexOf(endTime) <= timeOptions.indexOf(startTime)) {
      nextErrors.endTime = "End time must be later than start time.";
    }

    if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
      nextErrors.attendeeCount = "Enter at least one attendee.";
    } else if (attendeeCount > capacity) {
      nextErrors.attendeeCount = `This room supports up to ${capacity} people.`;
    }

    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      event.preventDefault();
    }
  }

  const fieldError = (field: keyof ClientErrors) => clientErrors[field] ?? state.fieldErrors?.[field]?.[0];

  return (
    <>
      <form action={formAction} className="space-y-4" onSubmit={validate}>
        <input name="roomId" type="hidden" value={roomId} />
        <div className="space-y-2">
          <Label htmlFor="bookingDate">Date</Label>
          <Input aria-invalid={Boolean(fieldError("bookingDate"))} defaultValue={defaultDate} id="bookingDate" min={defaultDate} name="bookingDate" type="date" />
          {fieldError("bookingDate") ? <p className="text-sm text-red-600">{fieldError("bookingDate")}</p> : null}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="startTime">Start</Label>
            <select
              aria-invalid={Boolean(fieldError("startTime"))}
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm aria-invalid:border-red-500"
              id="startTime"
              name="startTime"
              onChange={(event) => setStartTime(event.target.value)}
              value={startTime}
            >
              {timeOptions.slice(0, -1).map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
            {fieldError("startTime") ? <p className="text-sm text-red-600">{fieldError("startTime")}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">End</Label>
            <select
              aria-invalid={Boolean(fieldError("endTime"))}
              className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm aria-invalid:border-red-500"
              id="endTime"
              name="endTime"
              onChange={(event) => setEndTime(event.target.value)}
              value={endTime}
            >
              {timeOptions.slice(1).map((time) => <option key={time} value={time}>{time}</option>)}
            </select>
            {fieldError("endTime") ? <p className="text-sm text-red-600">{fieldError("endTime")}</p> : null}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="attendeeCount">Attendees</Label>
          <Input aria-invalid={Boolean(fieldError("attendeeCount"))} id="attendeeCount" max={capacity} min="1" name="attendeeCount" placeholder={`1-${capacity}`} type="number" />
          {fieldError("attendeeCount") ? <p className="text-sm text-red-600">{fieldError("attendeeCount")}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="purpose" name="purpose" placeholder="Project meeting" />
        </div>

        <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3 text-sm">
          <span className="text-muted-foreground">Estimated total</span>
          <span className="font-semibold">{estimatedPrice.toLocaleString("th-TH")} THB</span>
        </div>

        {state.status === "error" && state.message ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{state.message}</p>
        ) : null}

        <Button className="w-full gap-2" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarPlus className="h-4 w-4" aria-hidden="true" />}
          {pending ? "Checking availability..." : "Confirm booking"}
        </Button>
      </form>

      {showSuccess && state.bookingId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="presentation">
          <div aria-labelledby="booking-success-title" aria-modal="true" className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl" role="dialog">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CalendarCheck2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted" onClick={() => setShowSuccess(false)} type="button">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <h2 className="mt-5 text-xl font-semibold" id="booking-success-title">Booking created</h2>
            <p className="mt-2 text-sm text-muted-foreground">{roomName} is reserved for your selected time. Upload payment proof before the deadline.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button className="w-full" onClick={() => setShowSuccess(false)} variant="secondary">Stay on this room</Button>
              <Link className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-teal-800" href={`/bookings/${state.bookingId}`}>
                View booking
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
