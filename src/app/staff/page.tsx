import { Role } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/server/guards";

export default async function StaffPage() {
  await requireRole([Role.STAFF, Role.SUPER_ADMIN]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Staff payment review</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Payment approval workflow will be built in Day 2.</CardContent>
      </Card>
    </main>
  );
}
