"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z
  .object({
    branchId: z.string(),
    capacity: z.string().min(1, "Enter the number of attendees.").refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, "Attendees must be at least 1."),
    bookingDate: z.string().min(1, "Select a booking date."),
    startTime: z.string().min(1, "Select a start time."),
    endTime: z.string().min(1, "Select an end time."),
  })
  .refine((data) => data.endTime > data.startTime, { message: "End time must be later than start time.", path: ["endTime"] });

type SearchInput = z.infer<typeof searchSchema>;

type RoomSearchFormProps = {
  branches: Array<{ id: string; name: string }>;
  defaults: SearchInput;
  timeOptions: string[];
};

export function RoomSearchForm({ branches, defaults, timeOptions }: RoomSearchFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<SearchInput>({ resolver: zodResolver(searchSchema), defaultValues: defaults });

  function onSubmit(data: SearchInput) {
    const params = new URLSearchParams();
    if (data.branchId) params.set("branchId", data.branchId);
    params.set("capacity", data.capacity);
    params.set("bookingDate", data.bookingDate);
    params.set("startTime", data.startTime);
    params.set("endTime", data.endTime);

    startTransition(() => router.push(`/member?${params.toString()}`));
  }

  const error = (field: keyof SearchInput) => errors[field]?.message;

  return (
    <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="branchId">Branch</Label>
        <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" id="branchId" {...register("branchId")}>
          <option value="">All branches</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="capacity">Attendees</Label>
        <Input aria-invalid={Boolean(error("capacity"))} id="capacity" min="1" type="number" {...register("capacity")} />
        {error("capacity") ? <p className="text-sm text-red-600">{error("capacity")}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="bookingDate">Date</Label>
        <Input aria-invalid={Boolean(error("bookingDate"))} id="bookingDate" min={defaults.bookingDate} type="date" {...register("bookingDate")} />
        {error("bookingDate") ? <p className="text-sm text-red-600">{error("bookingDate")}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="startTime">Start</Label>
        <select className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm" id="startTime" {...register("startTime")}>
          {timeOptions.slice(0, -1).map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="endTime">End</Label>
        <select aria-invalid={Boolean(error("endTime"))} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm aria-invalid:border-red-500" id="endTime" {...register("endTime")}>
          {timeOptions.slice(1).map((time) => <option key={time} value={time}>{time}</option>)}
        </select>
        {error("endTime") ? <p className="text-sm text-red-600">{error("endTime")}</p> : null}
      </div>
      <Button className="gap-2 md:col-span-2 lg:col-span-6 lg:justify-self-end" disabled={pending} type="submit">
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
        {pending ? "Finding rooms..." : "Find available rooms"}
      </Button>
    </form>
  );
}
