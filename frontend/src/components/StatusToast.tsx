import { cn } from "@/lib/utils";

import { Spinner } from "./ui/spinner";

type StatusToastVariant = "error" | "loading" | "notification";

type StatusToastProps = {
  variant: StatusToastVariant;
  message: string;
  className?: string;
};

const variantClasses: Record<StatusToastVariant, string> = {
  error: "border-destructive/30 bg-destructive/10 text-destructive shadow-sm",
  loading: "border bg-background text-muted-foreground shadow-sm",
  notification: "border bg-background text-foreground shadow-sm",
};

export default function StatusToast({ variant, message, className }: StatusToastProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        variantClasses[variant],
        className,
      )}
    >
      {variant === "loading" ? <Spinner /> : null}
      <span>{message}</span>
    </div>
  );
}
