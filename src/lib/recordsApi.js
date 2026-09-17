const CHILDREN_KEY = "shishu_local_children";
const VACCINE_KEY = "shishu_local_vaccines";

function read(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function sortDesc(rows, field) {
  return [...rows].sort((a, b) => String(b[field] || "").localeCompare(String(a[field] || "")));
}

export async function listChildren(limit = 200) {
  return sortDesc(read(CHILDREN_KEY), "created_date").slice(0, limit);
}

export async function getChildById(id) {
  return read(CHILDREN_KEY).find((child) => child.id === id || child.shishu_id === id) || null;
}

export async function createChild(data) {
  const created = {
    ...data,
    id: data.id || data.shishu_id,
    created_date: data.created_date || new Date().toISOString(),
  };
  write(
    CHILDREN_KEY,
    [created, ...read(CHILDREN_KEY).filter((row) => row.shishu_id !== created.shishu_id)]
  );
  return created;
}

export async function listVaccineRecords(limit = 1000) {
  return sortDesc(read(VACCINE_KEY), "due_date").slice(0, limit);
}

export async function filterVaccinesByShishu(shishuId) {
  return read(VACCINE_KEY)
    .filter((row) => row.shishu_id === shishuId)
    .sort((a, b) => String(a.due_date || "").localeCompare(String(b.due_date || "")));
}

export async function bulkCreateVaccines(records) {
  const withIds = records.map((row, index) => ({
    ...row,
    id: row.id || `${row.shishu_id}-${row.vaccine_name}-${index}`,
  }));
  const existing = read(VACCINE_KEY).filter(
    (row) => !withIds.some((item) => item.id === row.id || (item.shishu_id === row.shishu_id && item.vaccine_name === row.vaccine_name))
  );
  write(VACCINE_KEY, [...withIds, ...existing]);
  return withIds;
}

export async function updateVaccineRecord(id, data) {
  const rows = read(VACCINE_KEY).map((row) => (row.id === id ? { ...row, ...data } : row));
  write(VACCINE_KEY, rows);
  return rows.find((row) => row.id === id) || null;
}
