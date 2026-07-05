import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 text-center">
        <p className="text-sm font-medium text-primary">Access restricted</p>
        <h1 className="mt-2 text-2xl font-semibold">You do not have permission</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your current role cannot access this workspace area.</p>
        <Link className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
