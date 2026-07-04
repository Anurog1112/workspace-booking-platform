import { Building2, LogIn } from "lucide-react";

import { loginAction } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params?.error === "CredentialsSignin";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle>Workspace Booking</CardTitle>
          <CardDescription>Sign in to manage rooms, bookings, and payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" defaultValue="member@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" defaultValue="Password123!" required />
            </div>
            {hasError ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Invalid email or password.</p> : null}
            <Button className="w-full gap-2" type="submit">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in
            </Button>
          </form>
          <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Demo accounts: superadmin@example.com, staff@example.com, member@example.com
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
