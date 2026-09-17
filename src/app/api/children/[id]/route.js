import { dbGetChildById, jsonError } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    const child = await dbGetChildById(params.id);
    if (!child) {
      return Response.json({ error: "Child not found" }, { status: 404 });
    }
    return Response.json(child);
  } catch (error) {
    return jsonError(error);
  }
}
