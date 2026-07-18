import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warning" | "danger" }) {
  const Icon = tone === "info" ? Info : AlertCircle;
  return (
    <div className={cn("notice", tone !== "info" && `notice-${tone}`)} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={19} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
