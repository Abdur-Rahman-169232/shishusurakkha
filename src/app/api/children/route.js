import { dbListChildren, dbUpsertChild, jsonError } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 200);
    const rows = await dbListChildren(limit);
    return Response.json(rows);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.shishu_id) {
      return Response.json({ error: "shishu_id is required" }, { status: 400 });
    }
    const created = await dbUpsertChild(body);
    return Response.json(created);
  } catch (error) {
    return jsonError(error);
  }
}
