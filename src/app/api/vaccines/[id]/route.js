import { dbUpdateVaccine, jsonError } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const updated = await dbUpdateVaccine(params.id, body || {});
    if (!updated) {
      return Response.json({ error: "Vaccine record not found" }, { status: 404 });
    }
    return Response.json(updated);
  } catch (error) {
    return jsonError(error);
  }
}
