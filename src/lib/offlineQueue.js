const QUEUE_KEY = "shishu_offline_queue";
const ONLINE_KEY = "shishu_online_mode";
export const QUEUE_CHANGED_EVENT = "shishu-queue-changed";

function notifyQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  }
}

export function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addToQueue(record) {
  const queue = getQueue();
  queue.push({
    ...record,
    _queued_at: new Date().toISOString(),
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifyQueueChanged();
  return queue;
}

export function clearQueue() {
  localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  notifyQueueChanged();
}

export function removeFromQueue(index) {
  const queue = getQueue();
  if (index < 0 || index >= queue.length) return queue;
  queue.splice(index, 1);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifyQueueChanged();
  return queue;
}

export function setQueueItems(items) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  notifyQueueChanged();
}

export function getQueueCount() {
  return getQueue().length;
}

export function getOnlineMode() {
  try {
    const raw = localStorage.getItem(ONLINE_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setOnlineMode(value) {
  localStorage.setItem(ONLINE_KEY, value ? "true" : "false");
  notifyQueueChanged();
  return Boolean(value);
}

export function isEffectivelyOnline() {
  const simulated = getOnlineMode();
  const browserOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  return simulated && browserOnline;
}
