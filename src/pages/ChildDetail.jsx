import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Baby,
  Calendar,
  Hospital,
  IdCard,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Syringe,
  XCircle,
} from "lucide-react";
import { filterVaccinesByShishu, getChildById, updateVaccineRecord } from "@/lib/recordsApi";
import {
  AGE_BANDS,
  ZERO_DOSE_CATCHUP,
  VACCINE_LABELS,
  VACCINE_SCHEDULE,
  canAdministerPentavalent,
  computeStatus,
  countGiven,
  getAgeDisplay,
  getAgeInMonths,
  groupForSchedule,
  isPentavalent,
  isZeroDoseCatchUp,
  orderRecordsBySchedule,
  withLiveStatus,
} from "@/lib/vaccineEngine";
import { todayISO, cn } from "@/lib/utils";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";
import StatusBadge from "@/components/ui/StatusBadge";
import VaccineStepper from "@/components/dashboard/VaccineStepper";

function ChildDetail() {
  const { id } = useParams();
  const [child, setChild] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [haName, setHaName] = useState("");
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const found = await getChildById(id);
    setChild(found);
    if (found?.shishu_id) {
      const vaccineRows = await filterVaccinesByShishu(found.shishu_id);
      setRecords(orderRecordsBySchedule(vaccineRows));
    } else {
      setRecords([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const liveRecords = useMemo(() => withLiveStatus(records), [records]);
  const stepperSteps = useMemo(() => {
    return VACCINE_SCHEDULE.map((entry) => {
      const match = liveRecords.find((row) => row.vaccine_name === entry.vaccine_name);
      return {
        ...entry,
        ...match,
        status: computeStatus(match?.due_date || null, match?.given_date, new Date()),
      };
    });
  }, [liveRecords]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="space-y-4">
        <Link to="/children" className="text-sm font-semibold text-primary">
          Back to registry
        </Link>
        <Card className="p-8 text-center">
          <h1 className="font-heading text-xl font-bold">Child not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">That Shishu ID is not in this EPI center list.</p>
        </Card>
      </div>
    );
  }

  const given = countGiven(liveRecords);
  const total = Math.max(liveRecords.length, VACCINE_SCHEDULE.length);
  const pct = total ? Math.round((given / total) * 100) : 0;
  const overdue = liveRecords.filter((row) => row.status === "OVERDUE");
  const months = getAgeInMonths(child.dob);
  const pentavalentBlocked = !canAdministerPentavalent(child.dob);
  const showCatchUp = child.zero_dose && isZeroDoseCatchUp(child.dob, liveRecords);
  const grouped = AGE_BANDS.map((band) => ({
    band,
    rows: liveRecords.filter((row) => groupForSchedule(row.vaccine_name) === band),
  })).filter((group) => group.rows.length);

  const markGiven = async (record) => {
    setSavingId(record.id);
    try {
      await updateVaccineRecord(record.id, {
        status: "GIVEN",
        given_date: todayISO(),
        administered_by_ha: haName.trim() || "HA-Field",
      });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/children" className="text-sm font-semibold text-primary">
        Back to registry
      </Link>

      <Card className="bg-primary p-5 text-primary-foreground">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <Baby className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-bold">{child.shishu_id}</h1>
            <p className="text-sm text-teal-50">
              {getAgeDisplay(child.dob)} old · {child.gender || "Unknown"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {child.zero_dose ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                  <AlertTriangle className="h-3.5 w-3.5" /> ZERO-DOSE
                </span>
              ) : null}
              <StatusBadge
                variant={child.sync_status === "PENDING_SYNC" ? "pending" : child.sync_status === "CONFLICT" ? "risk" : "ok"}
                label={child.sync_status === "PENDING_SYNC" ? "Pending" : child.sync_status === "CONFLICT" ? "Conflict" : "Synced"}
              />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm font-semibold">
          {given}/{total} doses · {pct}%
        </p>
        <div className="mt-2 h-2 rounded-full bg-white/20">
          <div className="h-2 rounded-full bg-white" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Syringe className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold">Dose Timeline</h2>
        </div>
        <VaccineStepper steps={stepperSteps} />
        <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold">
          <span className="text-emerald-700">Given</span>
          <span className="animate-blink-alert text-red-700">Overdue</span>
          <span className="text-muted-foreground">Due</span>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          { icon: IdCard, label: "Mother's NID", value: child.mother_nid },
          { icon: Baby, label: "Mother's Name", value: child.mother_name || "—" },
          { icon: Phone, label: "Phone", value: child.phone || "—" },
          { icon: Calendar, label: "Date of Birth", value: child.dob },
          { icon: Hospital, label: "EPI Center", value: [child.epi_center_code, child.epi_center_name].filter(Boolean).join(" · ") },
          { icon: MapPin, label: "Location", value: [child.upazila, child.district].filter(Boolean).join(", ") },
        ].map((item) => (
          <Card key={item.label} className="flex items-start gap-3 p-4">
            <item.icon className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-semibold">{item.value || "—"}</p>
            </div>
          </Card>
        ))}
      </div>

      {overdue.length ? (
        <div className="rounded-2xl border border-red-200 bg-red-100 p-4 text-red-700">
          <p className="font-bold">{overdue.length} overdue dose(s)</p>
          <p className="text-sm">This child needs catch-up vaccination.</p>
        </div>
      ) : null}

      {showCatchUp ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-100 p-4 text-amber-700">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <ShieldCheck className="h-4 w-4" /> Zero-Dose Catch-Up Plan
          </div>
          <p className="text-sm">
            WHO/DGHS guidance: immediately administer missed antigens for children aged 12–23 months. Do not delay the first visit.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ZERO_DOSE_CATCHUP.map((name) => {
              const givenDose = liveRecords.find((row) => row.vaccine_name === name && (row.status === "GIVEN" || row.given_date));
              return (
                <span
                  key={name}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    givenDose ? "bg-emerald-100 text-emerald-700" : "bg-amber-200 text-amber-800"
                  )}
                >
                  {givenDose ? "✓ " : ""}
                  {name}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {pentavalentBlocked ? (
        <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted p-4 text-muted-foreground">
          <XCircle className="h-5 w-5" />
          <p className="text-sm font-semibold">Pentavalent is blocked. This child is {months} months old (≥ 7 years).</p>
        </div>
      ) : null}

      <Card className="p-5">
        <h2 className="font-heading font-bold">Vaccine Schedule</h2>
        <div className="mt-3 space-y-2">
          <Label htmlFor="ha">HA Name</Label>
          <Input id="ha" placeholder="Administered by (default HA-Field)" value={haName} onChange={(event) => setHaName(event.target.value)} />
        </div>
        <div className="mt-4 space-y-6">
          {grouped.map((group) => (
            <div key={group.band}>
              <h3 className="mb-2 text-sm font-bold text-muted-foreground">{group.band}</h3>
              <div className="space-y-2">
                {group.rows.map((record) => {
                  const blocked = isPentavalent(record.vaccine_name) && pentavalentBlocked && record.status !== "GIVEN";
                  const givenAlready = record.status === "GIVEN" || record.given_date;
                  const badgeVariant = givenAlready ? "ok" : record.status === "OVERDUE" ? "risk" : "due";
                  return (
                    <div key={record.id || record.vaccine_name} className="rounded-2xl border border-border p-4">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-1 h-3 w-3 rounded-full",
                            givenAlready ? "bg-emerald-600" : record.status === "OVERDUE" ? "bg-red-600" : "bg-sky-600"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{VACCINE_LABELS[record.vaccine_name] || record.vaccine_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {record.due_date || "—"} · Given: {record.given_date || "—"} · by {record.administered_by_ha || "—"}
                          </p>
                          <div className="mt-2">
                            <StatusBadge variant={badgeVariant} label={givenAlready ? "Given" : record.status === "OVERDUE" ? "Overdue" : "Due"} pulse={record.status === "OVERDUE"} />
                          </div>
                        </div>
                        {givenAlready ? null : blocked ? (
                          <Button type="button" variant="secondary" disabled>
                            Blocked
                          </Button>
                        ) : (
                          <Button type="button" onClick={() => markGiven(record)} disabled={savingId === record.id}>
                            {savingId === record.id ? "Saving..." : "Mark Given"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default ChildDetail;
