"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
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
  }, [pathname]);

  return null;
}

export default ScrollToTop;
