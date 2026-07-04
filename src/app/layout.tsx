import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Workspace Booking Platform",
  description: "Room booking platform for co-working and meeting spaces.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
