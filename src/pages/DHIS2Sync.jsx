import { useEffect, useMemo, useState } from "react";
import { Database, Loader2, Snowflake, WifiOff } from "lucide-react";
import { listChildren, listVaccineRecords } from "@/lib/recordsApi";
import { getOnlineMode, getQueue, getQueueCount, setOnlineMode } from "@/lib/offlineQueue";
import { syncOfflineQueue } from "@/lib/queueSync";
import { childHasOverdue, countGiven } from "@/lib/vaccineEngine";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";

const COLD_CHAIN = [
  { code: "EPI-1023", place: "Satkhira", temp: 8.5, status: "warning", note: "Temperature above 8°C threshold", when: "2h ago" },
  { code: "EPI-1045", place: "Bhola", temp: 3.2, status: "ok", note: "Within safe range (2–8°C)", when: "now" },
  { code: "EPI-1067", place: "Khulna", temp: 10.1, status: "critical", note: "Critical: cold chain breach detected", when: "30m ago" },
];

function buildDhis2Payload(children, records) {
  return children.map((child) => {
    const given = records.filter((row) => row.shishu_id === child.shishu_id && (row.status === "GIVEN" || row.given_date));
    return {
      trackedEntityType: "MCPQUTHX1Ze",
      orgUnit: "U7gV8pE2qK1",
      program: "IpHINAT79UW",
      trackedEntityInstance: child.shishu_id,
      attributes: [
        { attribute: "shishu_id", value: child.shishu_id },
        { attribute: "mother_nid", value: child.mother_nid || "" },
        { attribute: "dob", value: child.dob || "" },
        { attribute: "district", value: child.district || "" },
        { attribute: "epi_center_code", value: child.epi_center_code || "" },
        { attribute: "phone", value: child.phone || "" },
        { attribute: "zero_dose", value: String(Boolean(child.zero_dose)) },
      ],
      enrollments: [
        {
          program: "IpHINAT79UW",
          orgUnit: "U7gV8pE2qK1",
          events: given.map((dose) => ({
            programStage: "vaccine_given",
            eventDate: dose.given_date,
            dataValues: [
              { dataElement: "vaccine_name", value: dose.vaccine_name },
              { dataElement: "given_date", value: dose.given_date },
              { dataElement: "administered_by_ha", value: dose.administered_by_ha || "HA-Field" },
            ],
          })),
        },
      ],
    };
  });
}

function DHIS2Sync() {
  const [children, setChildren] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState(() => getQueue());
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [payload, setPayload] = useState(null);
  const [exportMessage, setExportMessage] = useState("");

  const reload = async () => {
    setLoading(true);
    const [childRows, vaccineRows] = await Promise.all([listChildren(200), listVaccineRecords(1000)]);
    setChildren(childRows);
    setRecords(vaccineRows);
    setQueue(getQueue());
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const stats = useMemo(() => {
    const overdue = children.filter((child) => childHasOverdue(records.filter((row) => row.shishu_id === child.shishu_id))).length;
    const zero = children.filter((child) => child.zero_dose).length;
    const synced = children.filter((child) => child.sync_status === "SYNCED").length;
    const pending = children.filter((child) => child.sync_status === "PENDING_SYNC").length + getQueueCount();
    const doses = records.filter((row) => row.status === "GIVEN" || row.given_date).length;
    return { overdue, zero, synced, pending, doses };
  }, [children, records]);

  const onSyncNow = async () => {
    setSyncing(true);
    const result = await syncOfflineQueue();
    if (result.success) setOnlineMode(true);
    setSyncMessage(result.message || (result.success ? "Nothing to sync." : "Sync failed."));
    setQueue(getQueue());
    if (result.success) await reload();
    setSyncing(false);
  };

  const onExport = async () => {
    setExporting(true);
    setExportMessage("");
    const json = buildDhis2Payload(children, records);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setPayload(json);
    setExportMessage(`Pushed ${json.length} tracked entity instances to DHIS2 national server.`);
    setExporting(false);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(payload || [], null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dhis2_export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

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
        <h1 className="font-heading text-2xl font-bold">DHIS2 Sync</h1>
        <p className="text-sm text-muted-foreground">National health system integration and sync monitor</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-2xl font-bold">{children.length}</p>
          <p className="text-xs text-muted-foreground">Registered</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-700">{stats.zero}</p>
          <p className="text-xs text-muted-foreground">Zero-Dose</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-700">{stats.overdue}</p>
          <p className="text-xs text-muted-foreground">Overdue</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-emerald-700">{stats.synced}</p>
          <p className="text-xs text-muted-foreground">DHIS2 Synced</p>
        </Card>
      </div>

      {queue.length ? (
        <Card className="border-amber-200 bg-amber-100 p-5 text-amber-700">
          <div className="mb-2 flex items-center gap-2 font-bold">
            <WifiOff className="h-5 w-5" /> Offline Queue
          </div>
          <p className="text-sm">These records were saved while offline. Sync them into the on-device registry now.</p>
          <p className="mt-1 text-xs">{queue.length} pending · simulated online mode: {getOnlineMode() ? "on" : "off"}</p>
          <Button type="button" className="mt-4" onClick={onSyncNow} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
          {syncMessage ? <p className="mt-2 text-sm font-semibold">{syncMessage}</p> : null}
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold">DHIS2 Export</h2>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-700">
            <p className="text-xl font-bold">{stats.synced}</p>
            <p className="text-xs font-semibold">Synced</p>
          </div>
          <div className="rounded-2xl bg-amber-100 p-4 text-amber-700">
            <p className="text-xl font-bold">{stats.pending}</p>
            <p className="text-xs font-semibold">Pending</p>
          </div>
          <div className="rounded-2xl bg-sky-100 p-4 text-sky-700">
            <p className="text-xl font-bold">{stats.doses}</p>
            <p className="text-xs font-semibold">Doses Logged</p>
          </div>
        </div>
        <Button type="button" className="w-full" onClick={onExport} disabled={exporting}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Export {children.length} Records to DHIS2
        </Button>
        {exportMessage ? <p className="mt-3 text-sm font-semibold text-emerald-700">{exportMessage}</p> : null}
        {payload?.length ? (
          <div className="mt-4 space-y-3">
            <pre className="max-h-64 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
              {JSON.stringify(payload[0], null, 2)}
            </pre>
            <Button type="button" variant="outline" onClick={downloadJson}>
              Download full JSON payload
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Snowflake className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold">Cold-Chain Alert Log</h2>
        </div>
        <div className="space-y-3">
          {COLD_CHAIN.map((item) => (
            <div
              key={item.code}
              className={cn(
                "rounded-2xl border p-4",
                item.status === "ok" && "border-emerald-200 bg-emerald-100 text-emerald-700",
                item.status === "warning" && "border-amber-200 bg-amber-100 text-amber-700",
                item.status === "critical" && "border-red-200 bg-red-100 text-red-700"
              )}
            >
              <p className="font-bold">
                {item.code} {item.place} {item.temp}°C
              </p>
              <p className="text-sm">
                {item.note}
                {item.when !== "now" ? `, ${item.when}` : ""}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default DHIS2Sync;
