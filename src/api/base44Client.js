import { createClient } from "@base44/sdk";
import { publicEnv } from "@/lib/env";

export const base44 = createClient({
  appId: publicEnv.base44AppId || "local-dev",
});
