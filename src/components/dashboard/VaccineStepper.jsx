import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function VaccineStepper({ steps = [] }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max items-start">
        {steps.map((step, index) => {
          const status = step.status || "DUE";
          const isGiven = status === "GIVEN";
          const isOverdue = status === "OVERDUE";
          const shortLabel = String(step.vaccine_name || step.label || "").split("-")[0].split(" ")[0];
          const dateLabel = isGiven ? step.given_date : step.due_date;
          return (
            <div key={`${step.vaccine_name}-${index}`} className="flex w-[92px] flex-col items-center">
              <div className="flex w-full items-center">
                <div className={cn("h-0.5 flex-1", index === 0 ? "bg-transparent" : "bg-border")} />
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                    isGiven && "border-emerald-200 bg-emerald-100 text-emerald-700",
                    isOverdue && "animate-blink-alert border-red-200 bg-red-100 text-red-700",
                    !isGiven && !isOverdue && "border-slate-200 bg-white text-muted-foreground"
                  )}
                >
                  {isGiven ? <CheckCircle2 className="h-4 w-4" /> : isOverdue ? <AlertTriangle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </div>
                <div className={cn("h-0.5 flex-1", index === steps.length - 1 ? "bg-transparent" : "bg-border")} />
              </div>
              <p
                className={cn(
                  "mt-2 text-center text-[11px] font-semibold",
                  isGiven && "text-emerald-700",
                  isOverdue && "text-red-700",
                  !isGiven && !isOverdue && "text-muted-foreground"
                )}
              >
                {shortLabel}
              </p>
              <p className="text-center text-[10px] text-muted-foreground">{dateLabel || "—"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VaccineStepper;
