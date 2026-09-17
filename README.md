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

Child and vaccine records are stored in **Vercel Blob** and cached on-device for offline field use.

## Tech stack

Next.js 14 (App Router), React 18, Tailwind CSS, Vercel Blob, Firebase Auth, Base44 (optional OCR / speech / platform login). Hosted on Vercel.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Copy `.env.example` to `.env.local` for optional cloud services.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BASE44_APP_ID` | Optional. Platform login, card OCR, and text-to-speech |
| `NEXT_PUBLIC_FIREBASE_*` | Optional. Parallel Firebase Auth (`/firebase/login`) |

Without these keys the tracker still runs: local demo login, on-device cache, camera capture, and DHIS2 JSON export. Child records are stored in **Vercel Blob** and cached in the browser for offline use.

| Variable | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Injected by the Vercel Blob store. Server-only. |

```bash
npm run build
npm start
```

## Deploy on Vercel

1. Import [the GitHub repo](https://github.com/Abdur-Rahman-169232/shishusurakkha) in [Vercel](https://vercel.com/new).
2. Framework preset: **Next.js** (auto-detected).
3. Add the `NEXT_PUBLIC_*` variables above in Project Settings → Environment Variables if you use Base44 or Firebase.
4. Deploy. Camera and mic features need HTTPS, which Vercel provides.

Local production check:

```bash
npm run build
npm start
```

## Data model

Records live in **Vercel Blob** and are cached in `localStorage` for offline field use. The client API is [`src/lib/recordsApi.js`](src/lib/recordsApi.js); the server store is [`src/lib/db.js`](src/lib/db.js).

**Child** — `shishu_id` (`SHISHU-YYYY-NNNNNN`), mother name/NID/phone, EPI center, DOB, gender, district, upazila, `sync_status`, `zero_dose`

**Vaccine record** — `shishu_id`, vaccine name, dose number, status (`GIVEN` \| `DUE` \| `OVERDUE` \| `MISSED`), due/given dates, administering HA

Schedule logic is in [`src/lib/vaccineEngine.js`](src/lib/vaccineEngine.js).

## License

MIT
