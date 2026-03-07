import { useState, useEffect } from "react";

// ─── RESPONSIVE BREAKPOINTS ───
export default function useBreakpoint() {
  const get = () => {
    const w = window.innerWidth;
    if (w >= 1024) return "desktop";
    if (w >= 768) return "tablet";
    return "mobile";
  };
  const [bp, setBp] = useState(get);
  useEffect(() => {
    let timer;
    const onResize = () => { clearTimeout(timer); timer = setTimeout(() => setBp(get()), 80); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return bp;
}
