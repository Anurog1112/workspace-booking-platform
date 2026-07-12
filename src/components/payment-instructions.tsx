import { Landmark } from "lucide-react";

type PaymentInstructionsProps = {
  amount: string;
};

export function PaymentInstructions({ amount }: PaymentInstructionsProps) {
  return (
    <div className="rounded-md border border-dashed bg-muted/60 p-4 text-sm">
      <div className="flex items-center gap-2 font-semibold">
        <Landmark className="h-4 w-4 text-primary" aria-hidden="true" />
        Mock Bank transfer
      </div>
      <dl className="mt-3 grid grid-cols-[110px_1fr] gap-2">
        <dt className="text-muted-foreground">Bank</dt>
        <dd>Workspace Mock Bank</dd>
        <dt className="text-muted-foreground">Account name</dt>
        <dd>Workspace Booking</dd>
        <dt className="text-muted-foreground">Account no.</dt>
        <dd className="font-mono font-semibold">xxx-x-xxxxx-x</dd>
        <dt className="text-muted-foreground">Amount</dt>
        <dd className="font-semibold">{amount} THB</dd>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">Mock payment details for project demonstration only.</p>
    </div>
  );
}
