"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Baby,
  Database,
  Loader2,
  Mic,
  RefreshCw,
  ScanLine,
  Snowflake,
  Syringe,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { listChildren, listVaccineRecords } from "@/lib/recordsApi";
import { getQueueCount } from "@/lib/offlineQueue";
import { childHasOverdue, countGiven } from "@/lib/vaccineEngine";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import StatusBadge from "@/components/ui/StatusBadge";
import ProgressRing from "@/components/dashboard/ProgressRing";
import Sparkline from "@/components/dashboard/Sparkline";
import DistrictChart from "@/components/dashboard/DistrictChart";

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function Home() {
  const [children, setChildren] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueCount, setQueueCount] = useState(() => getQueueCount());
  const coldChainTemp = 4.6;
  const coldChainOk = coldChainTemp >= 2 && coldChainTemp <= 8;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [childRows, vaccineRows] = await Promise.all([listChildren(200), listVaccineRecords(1000)]);
      if (!active) return;
      setChildren(childRows);
      setRecords(vaccineRows);
      setQueueCount(getQueueCount());
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    const createdAt = (child) => new Date(child.created_date || child.dob || now);
    const thisWeek = children.filter((child) => createdAt(child) >= weekAgo).length;
    const lastWeek = children.filter((child) => createdAt(child) >= twoWeeksAgo && createdAt(child) < weekAgo).length;
    const spark = Array.from({ length: 7 }, (_, index) => {
      const day = startOfDay(now);
      day.setDate(day.getDate() - (6 - index));
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      return children.filter((child) => {
        const at = createdAt(child);
        return at >= day && at < next;
      }).length;
    });
    const zeroDose = children.filter((child) => child.zero_dose);
    const zeroDoseCaughtUp = zeroDose.filter((child) => {
      const childRecords = records.filter((row) => row.shishu_id === child.shishu_id);
      return countGiven(childRecords) >= 1;
    }).length;
    const pendingChildren = children.filter((child) => child.sync_status === "PENDING_SYNC").length;
    const pendingTotal = pendingChildren + queueCount;
    const synced = children.filter((child) => child.sync_status === "SYNCED").length;
    const districts = {};
    children.forEach((child) => {
      const key = child.district || "Unknown";
      if (!districts[key]) {
        districts[key] = { district: key, upazila: child.upazila, registered: 0, given: 0, target: 10 };
      }
      districts[key].registered += 1;
      districts[key].given += countGiven(records.filter((row) => row.shishu_id === child.shishu_id));
    });
    return {
      thisWeek,
      lastWeek,
      spark,
      zeroDoseCount: zeroDose.length,
      zeroDoseCaughtUp,
      pendingTotal,
      synced,
      districtRows: Object.values(districts),
    };
  }, [children, records, queueCount]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!children.length) {
    return (
      <div>
        <h1 className="font-heading text-2xl font-bold">Vaccination overview for your EPI center</h1>
        <Card className="mt-8 flex flex-col items-center p-10 text-center">
          <Baby className="h-16 w-16 text-primary" />
          <h2 className="mt-4 font-heading text-xl font-bold">No children registered yet</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Scan a paper EPI card to register the first child and generate the WHO/DGHS schedule automatically.
          </p>
          <Button asChild className="mt-6">
            <Link href="/scan">Scan EPI Card</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const trendUp = metrics.thisWeek >= metrics.lastWeek;
  const catchMax = Math.max(metrics.zeroDoseCount, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Vaccination overview for your EPI center</h1>
        <p className="text-sm text-muted-foreground">Live coverage, catch-up, and sync health</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/children" className="block">
          <Card className="h-full p-4">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Users className="h-5 w-5" />
              </div>
              <Sparkline data={metrics.spark} colorClass="stroke-primary" />
            </div>
            <p className="mt-3 font-heading text-3xl font-bold">{children.length}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">Registered</p>
              <span className={cn("inline-flex items-center gap-1 text-xs font-bold", trendUp ? "text-emerald-700" : "text-amber-700")}>
                {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {trendUp ? `+${metrics.thisWeek}` : metrics.thisWeek - metrics.lastWeek}
              </span>
            </div>
          </Card>
        </Link>

        <Link href="/children" className="block">
          <Card className="h-full p-4">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Baby className="h-5 w-5" />
              </div>
              <ProgressRing value={metrics.zeroDoseCaughtUp} max={catchMax} size={64} stroke={7} label="Zero-dose catch-up rate" />
            </div>
            <p className="mt-3 text-sm font-bold">Catch-Up Rate</p>
            <p className="text-xs text-muted-foreground">
              {metrics.zeroDoseCaughtUp}/{metrics.zeroDoseCount} zero-dose
            </p>
          </Card>
        </Link>

        <Link href="/dhis2" className="block">
          <Card className={cn("h-full p-4", metrics.pendingTotal > 0 && "animate-pulse-ring")}>
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", metrics.pendingTotal > 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground")}>
              <RefreshCw className="h-5 w-5" />
            </div>
            <p className="mt-3 font-heading text-3xl font-bold">{metrics.pendingTotal}</p>
            <p className="text-xs text-muted-foreground">Pending Sync</p>
            {metrics.pendingTotal > 0 ? <p className="mt-1 text-xs font-bold text-amber-700">Action needed</p> : null}
          </Card>
        </Link>

        <Link href="/dhis2" className="block">
          <Card className="h-full p-4">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", coldChainOk ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700")}>
              <Snowflake className="h-5 w-5" />
            </div>
            <p className={cn("mt-3 font-heading text-3xl font-bold", coldChainOk ? "text-emerald-700" : "text-red-700")}>
              {coldChainOk ? "OK" : "Alert"}
            </p>
            <p className="text-xs text-muted-foreground">{coldChainOk ? "2–8°C Normal" : "Temp breach"}</p>
          </Card>
        </Link>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading font-bold">Sync Status</h2>
          <Link href="/dhis2" className="text-sm font-semibold text-primary">
            View DHIS2 →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-emerald-100 p-4 text-emerald-700">
            <p className="text-2xl font-bold">{metrics.synced}</p>
            <p className="text-xs font-semibold">Synced</p>
          </div>
          <div className="rounded-2xl bg-amber-100 p-4 text-amber-700">
            <p className="text-2xl font-bold">{metrics.pendingTotal}</p>
            <p className="text-xs font-semibold">Pending</p>
          </div>
          <div className="rounded-2xl bg-muted p-4 text-foreground">
            <p className="text-2xl font-bold">{children.length}</p>
            <p className="text-xs font-semibold">Total</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Syringe className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-bold">District Distribution</h2>
        </div>
        <DistrictChart data={metrics.districtRows} />
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/scan" className="rounded-2xl bg-primary p-5 text-primary-foreground">
          <ScanLine className="h-6 w-6" />
          <p className="mt-3 font-heading text-lg font-bold">Scan EPI Card</p>
          <p className="text-sm text-teal-50">Register a child via OCR scanning</p>
        </Link>
        <Link href="/voice" className="rounded-2xl bg-violet-700 p-5 text-white">
          <Mic className="h-6 w-6" />
          <p className="mt-3 font-heading text-lg font-bold">Voice Reminders</p>
          <p className="text-sm text-violet-100">Launch IVR campaigns for overdue doses</p>
        </Link>
        <Link href="/dhis2" className="rounded-2xl border border-primary/20 bg-accent p-5 text-accent-foreground">
          <Database className="h-6 w-6" />
          <p className="mt-3 font-heading text-lg font-bold">DHIS2 Export</p>
          <p className="text-sm">Push records to national health system</p>
        </Link>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading font-bold">Recently Registered</h2>
          <Link href="/children" className="text-sm font-semibold text-primary">
            View all →
          </Link>
        </div>
        <div className="space-y-3">
          {children.slice(0, 5).map((child) => {
            const overdue = childHasOverdue(records.filter((row) => row.shishu_id === child.shishu_id));
            const variant = child.sync_status === "PENDING_SYNC" ? "pending" : child.sync_status === "CONFLICT" ? "risk" : "ok";
            const label = child.sync_status === "PENDING_SYNC" ? "Pending" : child.sync_status === "CONFLICT" ? "Conflict" : "Synced";
            return (
              <Link key={child.shishu_id} href={`/children/${child.id || child.shishu_id}`} className="flex min-h-[48px] items-center gap-3 rounded-xl border border-border p-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-full font-bold", overdue ? "bg-red-100 text-red-700" : "bg-accent text-accent-foreground")}>
                  {(child.mother_name || "C").slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{child.shishu_id}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {child.mother_name || "Mother"} · {child.district}
                  </p>
                </div>
                <StatusBadge variant={variant} label={label} />
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default Home;
