import { redirect } from "next/navigation";
import Link from "next/link";
import { Building2, CalendarCheck, CreditCard, ShieldCheck } from "lucide-react";

import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1fr_520px] lg:items-center">
        <div>
          <div className="mb-8 flex items-center gap-2 font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="h-5 w-5" aria-hidden="true" />
            </span>
            Workspace Booking
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Meeting room booking platform</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal md:text-6xl">Find and book workspaces without messy back-and-forth.</h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
            Search rooms, reserve time slots, upload payment proof, and let staff manage approvals in one role-based workspace system.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-teal-800" href="/login">
              Sign in
            </Link>
            <Link className="inline-flex h-11 items-center justify-center rounded-md border bg-card px-5 text-sm font-semibold hover:bg-muted" href="/register">
              Create member account
            </Link>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Search availability", icon: CalendarCheck },
              { label: "Submit payment proof", icon: CreditCard },
              { label: "Role-secured workflow", icon: ShieldCheck },
            ].map((item) => (
              <div className="rounded-lg border bg-card p-4" key={item.label}>
                <item.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div
          aria-label="Modern meeting room workspace"
          className="h-80 overflow-hidden rounded-lg border bg-card bg-cover bg-center shadow-sm lg:h-[520px]"
          role="img"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80)" }}
        />
      </section>
    </main>
  );
}
