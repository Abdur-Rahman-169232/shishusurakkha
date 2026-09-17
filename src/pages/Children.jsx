import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Baby, Clock, Loader2, Search } from "lucide-react";
import { listChildren, listVaccineRecords } from "@/lib/recordsApi";
import { getQueue, getQueueCount } from "@/lib/offlineQueue";
import {
  childHasOverdue,
  childIsFullyVaccinated,
  getAgeDisplay,
} from "@/lib/vaccineEngine";
import { cn } from "@/lib/utils";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import StatusBadge from "@/components/ui/StatusBadge";

const FILTERS = ["All", "Zero-Dose", "Overdue", "Pending Sync"];

function Children() {
  const [children, setChildren] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [queue, setQueue] = useState(() => getQueue());

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [childRows, vaccineRows] = await Promise.all([listChildren(200), listVaccineRecords(1000)]);
      if (!active) return;
      setChildren(childRows);
      setRecords(vaccineRows);
      setQueue(getQueue());
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return children.filter((child) => {
      const childRecords = records.filter((row) => row.shishu_id === child.shishu_id);
      const haystack = [child.shishu_id, child.mother_name, child.mother_nid, child.district].join(" ").toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (filter === "Zero-Dose") return Boolean(child.zero_dose);
      if (filter === "Overdue") return childHasOverdue(childRecords);
      if (filter === "Pending Sync") return child.sync_status === "PENDING_SYNC";
      return true;
    });
  }, [children, records, query, filter]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Children Registry</h1>
        <p className="text-sm text-muted-foreground">
          {children.length} registered · {getQueueCount()} in offline queue
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search Shishu ID, mother, NID, district"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "min-h-[48px] rounded-full px-4 text-sm font-semibold",
              filter === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {queue.length ? (
        <Card className="border-amber-200 bg-amber-100 p-4 text-amber-700">
          <div className="mb-3 flex items-center gap-2 font-bold">
            <Clock className="h-4 w-4" /> Offline Queue
          </div>
          <div className="space-y-2">
            {queue.map((item, index) => (
              <div key={`${item.child?.shishu_id}-${index}`} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
                <div>
                  <p className="font-semibold">{item.child?.shishu_id}</p>
                  <p className="text-xs">
                    NID {item.child?.mother_nid} · DOB {item.child?.dob}
                  </p>
                </div>
                <StatusBadge variant="pending" />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {!filtered.length ? (
        <Card className="flex flex-col items-center p-10 text-center">
          <Baby className="h-12 w-12 text-primary" />
          <p className="mt-3 font-heading text-lg font-bold">No children found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((child) => {
            const childRecords = records.filter((row) => row.shishu_id === child.shishu_id);
            const overdue = childHasOverdue(childRecords);
            const complete = childIsFullyVaccinated(childRecords);
            const tint = overdue ? "bg-red-100 text-red-700" : complete ? "bg-emerald-100 text-emerald-700" : "bg-accent text-accent-foreground";
            return (
              <Link
                key={child.shishu_id}
                to={`/children/${child.id || child.shishu_id}`}
                className="flex min-h-[48px] items-center gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-full font-bold", tint)}>
                  {(child.mother_name || "C").slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{child.shishu_id}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {child.mother_name || "Mother"} · {getAgeDisplay(child.dob)} · {child.district}
                  </p>
                  <p className={cn("text-xs font-semibold", overdue ? "text-red-700" : complete ? "text-emerald-700" : "text-muted-foreground")}>
                    {overdue ? "Has overdue doses" : complete ? "Fully vaccinated" : "Schedule in progress"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {child.zero_dose ? <StatusBadge variant="risk" label="Zero-Dose" /> : null}
                  <StatusBadge
                    variant={child.sync_status === "PENDING_SYNC" ? "pending" : "ok"}
                    label={child.sync_status === "PENDING_SYNC" ? "Pending" : "Synced"}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Children;
