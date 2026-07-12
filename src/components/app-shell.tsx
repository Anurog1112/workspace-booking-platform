import { Role } from "@prisma/client";
import { Building2, CalendarClock, CalendarDays, DoorOpen, LayoutDashboard, LogOut, ShieldCheck, UserCog } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/status-badge";
import type { Session } from "next-auth";

type AppShellProps = {
  children: ReactNode;
  session: Session;
};

const navigation = {
  [Role.MEMBER]: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/member", label: "Book rooms", icon: CalendarClock },
    { href: "/member/bookings", label: "My bookings", icon: CalendarDays },
  ],
  [Role.STAFF]: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/member", label: "Book rooms", icon: CalendarClock },
    { href: "/member/bookings", label: "My bookings", icon: CalendarDays },
    { href: "/staff", label: "Staff review", icon: ShieldCheck },
  ],
  [Role.SUPER_ADMIN]: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/member", label: "Book rooms", icon: CalendarClock },
    { href: "/member/bookings", label: "My bookings", icon: CalendarDays },
    { href: "/staff", label: "Staff review", icon: ShieldCheck },
    { href: "/admin", label: "Rooms", icon: DoorOpen },
    { href: "/admin/users", label: "Users", icon: UserCog },
  ],
};

export function AppShell({ children, session }: AppShellProps) {
  const role = session.user.role ?? Role.MEMBER;
  const userInitial = (session.user.name ?? session.user.email ?? "U").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3">
            <Link className="flex items-center gap-2 font-semibold" href="/dashboard">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>Workspace Booking</span>
            </Link>
          </div>

          <nav className="hidden gap-1 overflow-x-auto md:flex">
            {navigation[role].map((item) => (
              <Link
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                href={item.href}
                key={item.href}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-sm font-medium">{session.user.name ?? session.user.email}</p>
              <StatusBadge status={role} />
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-sm font-semibold">{userInitial}</div>
            <form action={logoutAction}>
              <SubmitButton className="h-9 gap-2 px-3" pendingLabel="Signing out..." variant="secondary">
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Logout</span>
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 md:px-6 md:pb-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t bg-card md:hidden" style={{ gridTemplateColumns: `repeat(${navigation[role].length}, minmax(0, 1fr))` }}>
        {navigation[role].map((item) => (
          <Link className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-medium text-muted-foreground" href={item.href} key={item.href}>
            <item.icon className="h-4 w-4" aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
