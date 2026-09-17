import { addDaysISO, daysBetween, parseISODate, todayISO } from "@/lib/utils";

export const DISTRICTS = [
  "Satkhira",
  "Bhola",
  "Khulna",
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Sylhet",
  "Barishal",
  "Rangpur",
  "Mymensingh",
];

export const VACCINE_SCHEDULE = [
  { vaccine_name: "BCG", weeks: 0, dose: 1, group: "Birth" },
  { vaccine_name: "Pentavalent-1", weeks: 6, dose: 1, group: "6 Weeks" },
  { vaccine_name: "OPV-1", weeks: 6, dose: 1, group: "6 Weeks" },
  { vaccine_name: "PCV-1", weeks: 6, dose: 1, group: "6 Weeks" },
  { vaccine_name: "fIPV-1", weeks: 6, dose: 1, group: "6 Weeks" },
  { vaccine_name: "Pentavalent-2", weeks: 10, dose: 2, group: "10 Weeks" },
  { vaccine_name: "OPV-2", weeks: 10, dose: 2, group: "10 Weeks" },
  { vaccine_name: "PCV-2", weeks: 10, dose: 2, group: "10 Weeks" },
  { vaccine_name: "Pentavalent-3", weeks: 14, dose: 3, group: "14 Weeks" },
  { vaccine_name: "OPV-3", weeks: 14, dose: 3, group: "14 Weeks" },
  { vaccine_name: "PCV-3", weeks: 14, dose: 3, group: "14 Weeks" },
  { vaccine_name: "fIPV-2", weeks: 14, dose: 2, group: "14 Weeks" },
  { vaccine_name: "MR-1", weeks: 39, dose: 1, group: "9 Months" },
  { vaccine_name: "MR-2", weeks: 78, dose: 2, group: "18 Months" },
];

export const VACCINE_LABELS = {
  BCG: "BCG (Tuberculosis)",
  "Pentavalent-1": "Pentavalent-1 (DTP-HepB-Hib)",
  "Pentavalent-2": "Pentavalent-2 (DTP-HepB-Hib)",
  "Pentavalent-3": "Pentavalent-3 (DTP-HepB-Hib)",
  "OPV-1": "OPV-1 (Polio)",
  "OPV-2": "OPV-2 (Polio)",
  "OPV-3": "OPV-3 (Polio)",
  "fIPV-1": "fIPV-1 (Inactivated Polio)",
  "fIPV-2": "fIPV-2 (Inactivated Polio)",
  "PCV-1": "PCV-1 (Pneumococcal)",
  "PCV-2": "PCV-2 (Pneumococcal)",
  "PCV-3": "PCV-3 (Pneumococcal)",
  "MR-1": "MR-1 (Measles-Rubella)",
  "MR-2": "MR-2 (Measles-Rubella)",
};

export const ZERO_DOSE_CATCHUP = ["BCG", "Pentavalent-1", "OPV-1", "PCV-1", "MR-1"];

export const AGE_BANDS = ["Birth", "6 Weeks", "10 Weeks", "14 Weeks", "9 Months", "18 Months", "Other"];

export function generateScheduleFromDOB(dob) {
  return VACCINE_SCHEDULE.map((entry) => ({
    vaccine_name: entry.vaccine_name,
    dose_number: entry.dose,
    due_date: addDaysISO(dob, entry.weeks * 7),
    status: "DUE",
    given_date: null,
    administered_by_ha: null,
  }));
}

export function computeStatus(dueDate, givenDate, today = new Date()) {
  if (givenDate) return "GIVEN";
  if (!dueDate) return "DUE";
  const overdueBy = daysBetween(dueDate, today);
  if (overdueBy > 7) return "OVERDUE";
  return "DUE";
}

export function getAgeInMonths(dob, today = new Date()) {
  const birth = parseISODate(dob);
  if (!birth) return 0;
  const t = today instanceof Date ? today : parseISODate(today);
  let months = (t.getFullYear() - birth.getFullYear()) * 12 + (t.getMonth() - birth.getMonth());
  if (t.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function getAgeDisplay(dob, today = new Date()) {
  const birth = parseISODate(dob);
  if (!birth) return "";
  const months = getAgeInMonths(dob, today);
  if (months < 1) {
    const days = Math.max(0, daysBetween(dob, today));
    return `${days} ${days === 1 ? "day" : "days"}`;
  }
  if (months < 24) {
    return `${months} ${months === 1 ? "month" : "months"}`;
  }
  const years = Math.floor(months / 12);
  const remain = months % 12;
  if (remain === 0) return `${years} ${years === 1 ? "year" : "years"}`;
  return `${years}y ${remain}m`;
}

export function isZeroDoseCatchUp(dob, records = [], today = new Date()) {
  const months = getAgeInMonths(dob, today);
  if (months < 12 || months > 23) return false;
  const anyGiven = records.some((record) => record.status === "GIVEN" || record.given_date);
  return !anyGiven;
}

export function canAdministerPentavalent(dob, today = new Date()) {
  return getAgeInMonths(dob, today) < 84;
}

export function generateShishuId(date = new Date()) {
  const year = date.getFullYear();
  const serial = Math.floor(Math.random() * 900000) + 100000;
  return `SHISHU-${year}-${serial}`;
}

export function isPentavalent(vaccineName) {
  return String(vaccineName || "").startsWith("Pentavalent");
}

export function orderRecordsBySchedule(records = []) {
  const index = new Map(VACCINE_SCHEDULE.map((item, i) => [item.vaccine_name, i]));
  return [...records].sort((a, b) => {
    const ai = index.has(a.vaccine_name) ? index.get(a.vaccine_name) : 999;
    const bi = index.has(b.vaccine_name) ? index.get(b.vaccine_name) : 999;
    if (ai !== bi) return ai - bi;
    return String(a.due_date || "").localeCompare(String(b.due_date || ""));
  });
}

export function withLiveStatus(records = [], today = new Date()) {
  return records.map((record) => ({
    ...record,
    status: computeStatus(record.due_date, record.given_date, today),
  }));
}

export function groupForSchedule(vaccineName) {
  return VACCINE_SCHEDULE.find((item) => item.vaccine_name === vaccineName)?.group || "Other";
}

export function countGiven(records = []) {
  return records.filter((record) => record.status === "GIVEN" || record.given_date).length;
}

export function childHasOverdue(records = [], today = new Date()) {
  return withLiveStatus(records, today).some((record) => record.status === "OVERDUE");
}

export function childIsFullyVaccinated(records = []) {
  const given = countGiven(records);
  return given >= VACCINE_SCHEDULE.length;
}
