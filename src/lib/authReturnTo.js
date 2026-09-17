const BLOCKED_PARAMS = [
  "access_token",
  "clear_access_token",
  "app_id",
  "app_base_url",
  "functions_version",
  "from_url",
];

export function getSafeReturnTo(value, fallback = "/") {
  if (!value || typeof value !== "string") return fallback;

  let candidate = value.trim();
  try {
    if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
      const url = new URL(candidate);
      if (url.origin !== window.location.origin) return fallback;
      candidate = `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return fallback;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;

  const [pathAndQuery, hash] = candidate.split("#");
  const [pathname, search] = pathAndQuery.split("?");
  const params = new URLSearchParams(search || "");
  BLOCKED_PARAMS.forEach((key) => params.delete(key));
  const nextSearch = params.toString();
  const cleaned = `${pathname}${nextSearch ? `?${nextSearch}` : ""}${hash ? `#${hash}` : ""}`;
  return cleaned.startsWith("/") ? cleaned : fallback;
}

export function readReturnToFromSearch(search, fallback = "/") {
  const params = new URLSearchParams(search);
  return getSafeReturnTo(params.get("returnTo"), fallback);
}
