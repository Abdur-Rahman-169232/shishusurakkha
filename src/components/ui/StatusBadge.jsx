import { AlertTriangle, CalendarClock, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export const VARIANTS = {
  ok: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    label: "Synced",
  },
  pending: {
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: RefreshCw,
    label: "Pending",
  },
  risk: {
    className: "bg-red-100 text-red-700 border-red-200",
    icon: AlertTriangle,
    label: "Overdue",
  },
  due: {
    className: "bg-sky-100 text-sky-700 border-sky-200",
    icon: CalendarClock,
    label: "Due Soon",
  },
};

function StatusBadge({ variant = "ok", label, icon: IconOverride, pulse = false, className }) {
  const config = VARIANTS[variant] || VARIANTS.ok;
  const Icon = IconOverride || config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold",
        config.className,
        pulse && "animate-blink-alert",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label || config.label}
    </span>
  );
}

export { StatusBadge };
export default StatusBadge;
