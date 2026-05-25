"use client";

import { useEffect, useRef, useState } from "react";

// =============================================================================
// ScrollFade — horizontal-scroll container with edge gradients that hint at
// "more content this way" instead of letting the right edge fall off the
// viewport without a visual cue.
//
// Used on mobile tab strips (where 4+ tabs don't fit at 375px width) and
// tables that overflow their card. Detects scroll position so the fade only
// shows on the edge where more content exists.
//
// fadeColor must match the parent background — usually "cream", "parchment",
// or the card surface. Defaults to cream.
// =============================================================================

const FADE_FROM: Record<string, { left: string; right: string }> = {
  cream:     { left: "from-cream",     right: "from-cream" },
  parchment: { left: "from-parchment", right: "from-parchment" },
  cream2:    { left: "from-cream2",    right: "from-cream2" },
  wheat:     { left: "from-wheat/20",  right: "from-wheat/20" },
};

export function ScrollFade({
  children,
  className,
  fadeColor = "cream",
}: {
  children: React.ReactNode;
  className?: string;
  fadeColor?: keyof typeof FADE_FROM;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function check() {
      if (!el) return;
      setCanLeft(el.scrollLeft > 4);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    // Also observe children — content size changes update scrollWidth
    Array.from(el.children).forEach((child) => ro.observe(child));
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);

  const colors = FADE_FROM[fadeColor] ?? FADE_FROM.cream;

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`overflow-x-auto scroll-smooth [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:bg-soil/15 [&::-webkit-scrollbar-thumb]:rounded-full ${className ?? ""}`}
      >
        {children}
      </div>
      {canLeft && (
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r ${colors.left} to-transparent transition-opacity duration-200`}
          aria-hidden="true"
        />
      )}
      {canRight && (
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l ${colors.right} to-transparent transition-opacity duration-200`}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
