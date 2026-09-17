import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Activity, Database, Mic, ScanLine, Users, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOnlineMode, getQueueCount, QUEUE_CHANGED_EVENT, setOnlineMode } from "@/lib/offlineQueue";
import { syncOfflineQueue } from "@/lib/queueSync";

const NAV = [
  { to: "/", label: "Dashboard", icon: Activity },
  { to: "/scan", label: "Scan EPI Card", icon: ScanLine },
  { to: "/children", label: "Children", icon: Users },
  { to: "/voice", label: "Voice Reminders", icon: Mic },
  { to: "/dhis2", label: "DHIS2 Sync", icon: Database },
];

function Layout() {
  const [onlineMode, setOnlineModeState] = useState(() => getOnlineMode());
  const [queueCount, setQueueCount] = useState(() => getQueueCount());
  const [browserOnline, setBrowserOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const refreshQueue = () => {
    setOnlineModeState(getOnlineMode());
    setQueueCount(getQueueCount());
  };

  useEffect(() => {
    const onChange = () => refreshQueue();
    window.addEventListener(QUEUE_CHANGED_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(QUEUE_CHANGED_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setBrowserOnline(true);
      if (getQueueCount() > 0) {
        const result = await syncOfflineQueue();
        refreshQueue();
        if (result.success) {
          console.log("Auto-sync:", result.message);
        } else {
          console.warn("Auto-sync failed:", result.message);
        }
      }
    };
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isOffline = !onlineMode || !browserOnline;

  const toggleOnline = () => {
    const next = !onlineMode;
    setOnlineMode(next);
    setOnlineModeState(next);
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-primary text-primary-foreground md:flex">
        <div className="p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-white/15 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-sm font-bold leading-tight">ShishuSurakkha</p>
              <p className="text-xs text-teal-50">Vaccination Tracker</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-semibold",
                  isActive
                    ? "bg-white text-primary"
                    : "text-teal-50 hover:bg-white/10"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button
            type="button"
            onClick={toggleOnline}
            className={cn(
              "flex min-h-[48px] w-full items-center justify-between rounded-xl px-3 text-sm font-semibold",
              onlineMode && browserOnline
                ? "bg-emerald-500/20 text-emerald-50"
                : "bg-amber-500/20 text-amber-50"
            )}
          >
            <span className="flex items-center gap-2">
              {onlineMode && browserOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {onlineMode && browserOnline ? "Online" : "Offline"}
            </span>
            {(!onlineMode || !browserOnline) && queueCount > 0 ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                {queueCount}
              </span>
            ) : null}
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex min-h-[56px] items-center justify-between bg-primary px-4 text-primary-foreground md:hidden">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <span className="font-heading font-bold">ShishuSurakkha</span>
        </div>
        <button
          type="button"
          onClick={toggleOnline}
          className={cn(
            "flex min-h-[32px] items-center gap-1 rounded-full px-2 py-1 text-xs font-bold",
            onlineMode && browserOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          )}
        >
          {onlineMode && browserOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {onlineMode && browserOnline ? "Online" : "Offline"}
          {queueCount > 0 ? <span>{queueCount}</span> : null}
        </button>
      </header>

      {isOffline ? (
        <div className="sticky top-14 z-10 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 md:top-0 md:ml-64">
          Offline Mode — {queueCount} records pending sync{" "}
          <Link to="/dhis2" className="underline">
            Sync Now
          </Link>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-6 pb-28 md:ml-64 md:pb-8">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid h-14 grid-cols-5 border-t border-border bg-white md:hidden">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                isActive ? "text-primary" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label.split(" ")[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default Layout;
