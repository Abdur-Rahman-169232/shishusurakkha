import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollToTop() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = window.performance?.getEntriesByType?.("navigation")?.[0];
    const isBackForward = window.performance?.navigation?.type === 2 || nav?.type === "back_forward";
    if (isBackForward) return;

    if (hash) {
      const id = hash.replace("#", "");
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView();
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash, key]);

  return null;
}

export default ScrollToTop;
