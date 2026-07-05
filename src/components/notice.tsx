import { CheckCircle2, CircleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

type NoticeProps = {
  type: "success" | "error" | "info";
  message: string;
  className?: string;
};

const styles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function Notice({ type, message, className }: NoticeProps) {
  const Icon = type === "error" ? CircleAlert : CheckCircle2;

  return (
    <div className={cn("mb-5 flex items-start gap-3 rounded-md border px-4 py-3 text-sm", styles[type], className)} role="status">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
