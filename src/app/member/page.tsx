import { Role } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/server/guards";

export default async function MemberPage() {
  await requireRole([Role.MEMBER, Role.STAFF, Role.SUPER_ADMIN]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Member bookings</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Room search and booking flow will be built in Day 2.</CardContent>
      </Card>
    </main>
  );
}
