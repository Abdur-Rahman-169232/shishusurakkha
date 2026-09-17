import { dbBulkUpsertVaccines, dbListVaccines, jsonError } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 1000);
    const shishuId = searchParams.get("shishu_id") || "";
    const rows = await dbListVaccines(limit, shishuId || undefined);
    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const records = Array.isArray(body) ? body : body?.records;
    if (!Array.isArray(records) || !records.length) {
      return Response.json({ error: "records array is required" }, { status: 400 });
    }
    const saved = await dbBulkUpsertVaccines(records);
    return Response.json(saved);
  } catch (error) {
    return jsonError(error);
  }
}
