import { isEffectivelyOnline } from "@/lib/offlineQueue";

const CHILDREN_KEY = "shishu_local_children";
const VACCINE_KEY = "shishu_local_vaccines";

function read(key) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function sortDesc(rows, field) {
  return [...rows].sort((a, b) => String(b[field] || "").localeCompare(String(a[field] || "")));
}

function cacheChild(child) {
  if (!child) return;
  write(CHILDREN_KEY, [child, ...read(CHILDREN_KEY).filter((row) => row.shishu_id !== child.shishu_id && row.id !== child.id)]);
}

function cacheVaccines(records) {
  if (!records?.length) return;
  const incomingIds = new Set(records.map((row) => row.id));
  const incomingKeys = new Set(records.map((row) => `${row.shishu_id}:${row.vaccine_name}`));
  const existing = read(VACCINE_KEY).filter(
    (row) => !incomingIds.has(row.id) && !incomingKeys.has(`${row.shishu_id}:${row.vaccine_name}`)
  );
  write(VACCINE_KEY, [...records, ...existing]);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

function canUseRemote() {
  return typeof window !== "undefined" && isEffectivelyOnline();
}

let hydratePromise = null;

async function hydrateRemoteFromLocal() {
  if (!canUseRemote()) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    const localChildren = read(CHILDREN_KEY);
    const localVaccines = read(VACCINE_KEY);
    if (!localChildren.length && !localVaccines.length) return;
    try {
      const remoteChildren = await api("/api/children?limit=1");
      if (Array.isArray(remoteChildren) && remoteChildren.length) return;
      await api("/api/sync", {
        method: "POST",
        body: JSON.stringify({ children: localChildren, vaccines: localVaccines }),
      });
    } catch {
      // Stay on the local cache if the first cloud sync is unavailable.
    }
  })();
  return hydratePromise;
}

export async function listChildren(limit = 200) {
  await hydrateRemoteFromLocal();
  if (canUseRemote()) {
    try {
      const rows = await api(`/api/children?limit=${limit}`);
      if (Array.isArray(rows) && rows.length) {
        write(CHILDREN_KEY, rows);
        return rows;
      }
      const local = sortDesc(read(CHILDREN_KEY), "created_date").slice(0, limit);
      if (local.length) return local;
      return rows;
    } catch {
      // Use the on-device cache when the network or database is down.
    }
  }
  return sortDesc(read(CHILDREN_KEY), "created_date").slice(0, limit);
}

export async function getChildById(id) {
  await hydrateRemoteFromLocal();
  if (canUseRemote()) {
    try {
      const child = await api(`/api/children/${encodeURIComponent(id)}`);
      cacheChild(child);
      return child;
    } catch {
      // Fall through to localStorage.
    }
  }
  return read(CHILDREN_KEY).find((child) => child.id === id || child.shishu_id === id) || null;
}

export async function createChild(data) {
  const created = {
    ...data,
    id: data.id || data.shishu_id,
    created_date: data.created_date || new Date().toISOString(),
    sync_status: data.sync_status || (canUseRemote() ? "SYNCED" : "PENDING_SYNC"),
  };
  cacheChild(created);
  if (canUseRemote()) {
    const saved = await api("/api/children", {
      method: "POST",
      body: JSON.stringify(created),
    });
    cacheChild(saved);
    return saved;
  }
  return created;
}

export async function listVaccineRecords(limit = 1000) {
  await hydrateRemoteFromLocal();
  if (canUseRemote()) {
    try {
      const rows = await api(`/api/vaccines?limit=${limit}`);
      if (Array.isArray(rows) && rows.length) {
        write(VACCINE_KEY, rows);
        return rows;
      }
      const local = sortDesc(read(VACCINE_KEY), "due_date").slice(0, limit);
      if (local.length) return local;
      return rows;
    } catch {
      // Use the on-device cache when the network or database is down.
    }
  }
  return sortDesc(read(VACCINE_KEY), "due_date").slice(0, limit);
}

export async function filterVaccinesByShishu(shishuId) {
  await hydrateRemoteFromLocal();
  if (canUseRemote()) {
    try {
      const rows = await api(`/api/vaccines?limit=1000&shishu_id=${encodeURIComponent(shishuId)}`);
      cacheVaccines(rows);
      return rows;
    } catch {
      // Fall through to localStorage.
    }
  }
  return read(VACCINE_KEY)
    .filter((row) => row.shishu_id === shishuId)
    .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")));
}

export async function bulkCreateVaccines(records) {
  const withIds = records.map((row, index) => ({
    ...row,
    id: row.id || `${row.shishu_id}-${row.vaccine_name}-${index}`,
  }));
  cacheVaccines(withIds);
  if (canUseRemote()) {
    const saved = await api("/api/vaccines", {
      method: "POST",
      body: JSON.stringify({ records: withIds }),
    });
    cacheVaccines(saved);
    return saved;
  }
  return withIds;
}

export async function updateVaccineRecord(id, data) {
  if (canUseRemote()) {
    try {
      const updated = await api(`/api/vaccines/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      write(
        VACCINE_KEY,
        read(VACCINE_KEY).map((row) => (row.id === id ? updated : row))
      );
      return updated;
    } catch {
      // Fall through to localStorage so a field HA can still mark a dose offline.
    }
  }
  const rows = read(VACCINE_KEY).map((row) => (row.id === id ? { ...row, ...data } : row));
  write(VACCINE_KEY, rows);
  return rows.find((row) => row.id === id) || null;
}
