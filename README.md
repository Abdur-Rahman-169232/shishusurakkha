# ShishuSurakkha (শিশুসুরক্ষা)

Mobile-first vaccination tracker for rural Health Assistants working under Bangladesh’s Expanded Programme on Immunization (EPI).

Field staff can register a child from a paper EPI card, generate the WHO/DGHS schedule from date of birth, mark doses as given, find zero-dose and overdue children, send dialect voice reminders, and export records as DHIS2 tracked-entity JSON.

The app is built for cheap Android phones, one-handed use, bright outdoor light, and patchy or missing internet.

## Features

- **Camera scan** — photograph an EPI card (rear camera) and extract details with OCR
- **Immunization engine** — 14-dose BCG / Pentavalent / OPV / fIPV / PCV / MR schedule from DOB
- **Offline queue** — save registrations locally and sync when connectivity returns
- **Catch-up alerts** — zero-dose (12–23 months) and overdue (>7 days past due) flags
- **Voice reminders** — Standard Bengali, Chittagonian, and Sylheti IVR scripts with generated audio
- **DHIS2 export** — download a Tracked Entity Instance payload for the national HMIS

Child and vaccine records are stored **on-device** (offline-first). There is no remote entity database.

## Tech stack

React 18, Vite, Tailwind CSS, React Router v6, Firebase Auth, Base44 (optional OCR / speech / platform login).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Copy `.env.example` to `.env` for optional cloud services.

| Variable | Purpose |
| --- | --- |
| `VITE_BASE44_APP_ID` | Optional. Platform login, card OCR, and text-to-speech |
| `VITE_FIREBASE_*` | Optional. Parallel Firebase Auth (`/firebase/login`) |

Without these keys the tracker still runs: local demo login, on-device registry, camera capture, and DHIS2 JSON export.

```bash
npm run build
npm run preview
```

## Data model

Records live in `localStorage` via [`src/lib/recordsApi.js`](src/lib/recordsApi.js).

**Child** — `shishu_id` (`SHISHU-YYYY-NNNNNN`), mother name/NID/phone, EPI center, DOB, gender, district, upazila, `sync_status`, `zero_dose`

**Vaccine record** — `shishu_id`, vaccine name, dose number, status (`GIVEN` \| `DUE` \| `OVERDUE` \| `MISSED`), due/given dates, administering HA

Schedule logic is in [`src/lib/vaccineEngine.js`](src/lib/vaccineEngine.js).

## License

MIT
