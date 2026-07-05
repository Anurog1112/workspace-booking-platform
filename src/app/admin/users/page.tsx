import { Role } from "@prisma/client";
import { Search, Users } from "lucide-react";

import { updateUserRoleAction } from "@/app/admin/users/actions";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/server/guards";
import { listUsers } from "@/server/services/user-service";

type AdminUsersPageProps = {
  searchParams?: Promise<{
    q?: string;
    updated?: string;
    error?: string;
  }>;
};

const roles = Object.values(Role);

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requireRole([Role.SUPER_ADMIN]);
  const params = await searchParams;
  const users = await listUsers({ q: params?.q });

  return (
    <div>
      <PageHeader
        eyebrow="Admin workspace"
        title="Users and roles"
        description="Search users, review current roles, and assign staff or super admin access. New public registrations always start as MEMBER."
      />

      {(params?.updated || params?.error) && (
        <div className="mb-4 rounded-md border bg-card px-4 py-3 text-sm">
          {params.updated ? "Role updated." : null}
          {params.error ? decodeURIComponent(params.error) : null}
        </div>
      )}

      <Card className="mb-5">
        <CardContent className="p-4">
          <form className="flex flex-col gap-3 md:flex-row md:items-end" method="get">
            <div className="flex-1 space-y-2">
              <Label htmlFor="q">Search</Label>
              <Input defaultValue={params?.q} id="q" name="q" placeholder="Name, email, phone" />
            </div>
            <Button className="gap-2" type="submit">
              <Search className="h-4 w-4" aria-hidden="true" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" aria-hidden="true" />}
          title="No users found"
          description="Try another keyword or create a member account from the register page."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="grid grid-cols-[1.4fr_1fr_220px] gap-4 border-b bg-muted px-4 py-3 text-sm font-semibold text-muted-foreground">
            <span>User</span>
            <span>Current role</span>
            <span>Change role</span>
          </div>
          {users.map((profile) => (
            <div className="grid grid-cols-1 gap-4 border-b px-4 py-4 last:border-b-0 md:grid-cols-[1.4fr_1fr_220px] md:items-center" key={profile.id}>
              <div>
                <p className="font-medium">{profile.fullName}</p>
                <p className="text-sm text-muted-foreground">{profile.user.email}</p>
                {profile.phone ? <p className="text-xs text-muted-foreground">{profile.phone}</p> : null}
              </div>
              <StatusBadge status={profile.role} />
              <form action={updateUserRoleAction} className="flex gap-2">
                <input name="profileId" type="hidden" value={profile.id} />
                <select className="h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm" defaultValue={profile.role} name="role">
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary">
                  Save
                </Button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
