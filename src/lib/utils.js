import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDaysISO(dateStr, days) {
  const date = parseISODate(dateStr);
  if (!date) return "";
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

export function daysBetween(fromStr, toDate = new Date()) {
  const from = parseISODate(fromStr);
  if (!from) return 0;
  const to = toDate instanceof Date ? toDate : parseISODate(toDate);
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((end - start) / 86400000);
}
