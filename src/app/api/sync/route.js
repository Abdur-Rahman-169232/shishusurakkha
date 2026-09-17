import { dbSyncAll, jsonError } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await dbSyncAll(body?.children || [], body?.vaccines || []);
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
