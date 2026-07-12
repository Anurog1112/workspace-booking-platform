import type { Metadata } from "next";

import "@/app/globals.css";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Workspace Booking Platform",
  description: "Room booking platform for co-working and meeting spaces.",
};

export const preferredRegion = "hnd1";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html lang="en">
      <body>{session?.user ? <AppShell session={session}>{children}</AppShell> : children}</body>
    </html>
  );
}
