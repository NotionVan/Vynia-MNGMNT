import { useState, useEffect } from "react";

export default function useTooltip() {
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    let timer = null;
    let hoverEl = null;

    const show = (text, rect) => {
      const x = Math.max(70, Math.min(rect.left + rect.width / 2, window.innerWidth - 70));
      const spaceAbove = rect.top;
      const flip = spaceAbove < 44;
      const y = flip ? rect.bottom + 6 : rect.top - 4;
      setTooltip({ text, x, y, flip });
    };
    const hide = () => setTooltip(null);

    // Mobile: long-press to show tooltip
    const onTouchStart = (e) => {
      const btn = e.target.closest("[title]");
      if (!btn) return;
      const text = btn.getAttribute("title");
      if (!text) return;
      const rect = btn.getBoundingClientRect();
      timer = setTimeout(() => show(text, rect), 400);
    };
    const onTouchEnd = () => { clearTimeout(timer); setTimeout(hide, 1500); };
    const onScroll = () => { clearTimeout(timer); hide(); };

    // Desktop: show JS tooltip on hover (replaces CSS ::after)
    const onMouseOver = (e) => {
      const el = e.target.closest("[title]");
      if (!el || el === hoverEl) return;
      if (hoverEl) {
        const prev = hoverEl.getAttribute("data-tip");
        if (prev) { hoverEl.setAttribute("title", prev); hoverEl.removeAttribute("data-tip"); }
      }
      hoverEl = el;
      const text = el.getAttribute("title");
      if (!text) return;
      el.setAttribute("data-tip", text);
      el.removeAttribute("title");
      const rect = el.getBoundingClientRect();
      show(text, rect);
    };
    const onMouseOut = (e) => {
      if (!hoverEl) return;
      if (hoverEl.contains(e.relatedTarget)) return;
      const t = hoverEl.getAttribute("data-tip");
      if (t) { hoverEl.setAttribute("title", t); hoverEl.removeAttribute("data-tip"); }
      hoverEl = null;
      hide();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      document.removeEventListener("scroll", onScroll);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      clearTimeout(timer);
    };
  }, []);

  return tooltip;
}
