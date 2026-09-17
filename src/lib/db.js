import { BlobNotFoundError, get, put } from "@vercel/blob";

const CHILDREN_PATH = "shishu/children.json";
const VACCINES_PATH = "shishu/vaccines.json";

function isBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID || process.env.VERCEL);
}

function assertConfigured() {
  if (!isBlobConfigured()) {
    const error = new Error("Vercel Blob storage is not configured.");
    error.status = 503;
    throw error;
  }
}

const blobOptions = {
  access: "private",
  addRandomSuffix: false,
  allowOverwrite: true,
  contentType: "application/json",
};

async function streamToJson(stream, fallback) {
  if (!stream) return fallback;
  const text = await new Response(stream).text();
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function readJson(pathname, fallback) {
  assertConfigured();
  try {
    const result = await get(pathname, { access: "private", useCache: false });
    if (!result || result.statusCode !== 200) return fallback;
    return streamToJson(result.stream, fallback);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return fallback;
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("not found") || message.includes("404")) return fallback;
    throw error;
  }
}

async function writeJson(pathname, value) {
  assertConfigured();
  await put(pathname, JSON.stringify(value), blobOptions);
}

function sortDesc(rows, field) {
  return [...rows].sort((a, b) => String(b[field] || "").localeCompare(String(a[field] || "")));
}

export async function dbListChildren(limit = 200) {
  const rows = await readJson(CHILDREN_PATH, []);
  return sortDesc(rows, "created_date").slice(0, Number(limit) || 200);
}

export async function dbGetChildById(id) {
  const rows = await readJson(CHILDREN_PATH, []);
  return rows.find((child) => child.id === id || child.shishu_id === id) || null;
}

export async function dbUpsertChild(data) {
  const created = {
    ...data,
    id: data.id || data.shishu_id,
    created_date: data.created_date || new Date().toISOString(),
    sync_status: data.sync_status || "SYNCED",
  };
  const rows = await readJson(CHILDREN_PATH, []);
  const next = [created, ...rows.filter((row) => row.shishu_id !== created.shishu_id && row.id !== created.id)];
  await writeJson(CHILDREN_PATH, next);
  return created;
}

export async function dbListVaccines(limit = 1000, shishuId) {
  const rows = await readJson(VACCINES_PATH, []);
  const filtered = shishuId ? rows.filter((row) => row.shishu_id === shishuId) : rows;
  const sorted = [...filtered].sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")));
  return (shishuId ? sorted : sortDesc(filtered, "due_date")).slice(0, Number(limit) || 1000);
}

export async function dbBulkUpsertVaccines(records) {
  const withIds = (records || []).map((row, index) => ({
    ...row,
    id: row.id || `${row.shishu_id}-${row.vaccine_name}-${index}`,
  }));
  const existing = await readJson(VACCINES_PATH, []);
  const incomingIds = new Set(withIds.map((row) => row.id));
  const incomingKeys = new Set(withIds.map((row) => `${row.shishu_id}:${row.vaccine_name}`));
  const kept = existing.filter(
    (row) => !incomingIds.has(row.id) && !incomingKeys.has(`${row.shishu_id}:${row.vaccine_name}`)
  );
  const next = [...withIds, ...kept];
  await writeJson(VACCINES_PATH, next);
  return withIds;
}

export async function dbUpdateVaccine(id, data) {
  const rows = await readJson(VACCINES_PATH, []);
  let updated = null;
  const next = rows.map((row) => {
    if (row.id !== id) return row;
    updated = { ...row, ...data, id };
    return updated;
  });
  if (!updated) return null;
  await writeJson(VACCINES_PATH, next);
  return updated;
}

export async function dbSyncAll(children = [], vaccines = []) {
  if (children.length) {
    const existingChildren = await readJson(CHILDREN_PATH, []);
    const incoming = new Map();
    for (const child of [...existingChildren, ...children]) {
      const record = {
        ...child,
        id: child.id || child.shishu_id,
        created_date: child.created_date || new Date().toISOString(),
        sync_status: "SYNCED",
      };
      incoming.set(record.shishu_id, record);
    }
    await writeJson(CHILDREN_PATH, sortDesc([...incoming.values()], "created_date"));
  }
  if (vaccines.length) {
    await dbBulkUpsertVaccines(vaccines);
  }
  return { children: children.length, vaccines: vaccines.length };
}

export function jsonError(error, fallback = 500) {
  const status = error.status || fallback;
  return Response.json({ error: error.message || "Request failed" }, { status });
}
