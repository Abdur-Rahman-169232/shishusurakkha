import { bulkCreateVaccines, createChild } from "@/lib/recordsApi";
import { clearQueue, getQueue, setOnlineMode, setQueueItems } from "@/lib/offlineQueue";

export async function syncOfflineQueue() {
  const queue = getQueue();
  if (!queue.length) {
    return { success: true, count: 0, message: "" };
  }

  let syncedCount = 0;
  try {
    for (const item of queue) {
      await createChild({
        ...item.child,
        sync_status: "SYNCED",
      });
      const schedule = (item.schedule || []).map((vaccine) => ({
        ...vaccine,
        shishu_id: item.child.shishu_id,
      }));
      if (schedule.length) {
        await bulkCreateVaccines(schedule);
      }
      syncedCount += 1;
    }
    clearQueue();
    setOnlineMode(true);
    return {
      success: true,
      count: syncedCount,
      message: `Successfully synced ${syncedCount} record(s) from the offline queue.`,
    };
  } catch (error) {
    const leftover = queue.slice(syncedCount);
    setQueueItems(leftover);
    return {
      success: false,
      count: syncedCount,
      message: "Sync error: " + (error?.message || "Unknown error"),
    };
  }
}
