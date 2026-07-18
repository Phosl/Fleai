import { cn } from "@/lib/utils";

export function StatusPill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "new" | "live" | "reserved" }) {
  return <span className={cn("status-pill", tone !== "default" && `status-${tone}`)}>{children}</span>;
}
