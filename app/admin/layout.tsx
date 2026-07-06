"use client";

// =============================================================================
// /admin layout — auth gate + sidebar
// =============================================================================
// Uses the /api/admin/metrics ping to check admin access on mount. Any
// non-200 response redirects out. No admin-signup exists — the is_admin
// flag is flipped manually via wrangler d1 execute.
// =============================================================================

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Mark, Sun } from "@/components/mark";
import { getMetrics } from "@/lib/admin/api";

const NAV = [
  { href: "/admin/", label: "Desk", hint: "signals + open work" },
  { href: "/admin/contacts/", label: "Contacts", hint: "every farm & farmer" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    getMetrics().then((r) => {
      if (cancelled) return;
      setState("ok" in r && r.ok ? "ok" : "denied");
      if (!("ok" in r) || !r.ok) {
        router.replace("/farmer/come-in/?next=/admin/");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state !== "ok") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <Sun className="w-12 h-12 text-wheat mx-auto mb-4 animate-[spin_6s_linear_infinite]" />
          <div className="display italic text-soil/65">One moment.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-cream">
      <aside className="hidden md:flex flex-col w-60 bg-soil text-parchment relative shrink-0">
        <div className="absolute inset-0 bg-grain opacity-30 pointer-events-none" />
        <div className="relative p-6">
          <Link href="/" className="flex items-center gap-3 group">
            <Mark className="w-8 h-8 text-wheat" />
            <div className="leading-none">
              <div className="display text-lg font-medium">Communicare</div>
              <div className="text-[9px] small-caps text-parchment/60 -mt-0.5">
                operator desk
              </div>
            </div>
          </Link>
        </div>
        <nav className="relative flex-1 px-3 pb-6 overflow-y-auto space-y-1">
          {NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 rounded transition-colors ${
                  active
                    ? "bg-parchment/15 text-parchment"
                    : "text-parchment/70 hover:bg-parchment/10 hover:text-parchment"
                }`}
              >
                <div className="text-sm">{item.label}</div>
                <div className="text-[10px] text-parchment/50 leading-tight">
                  {item.hint}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
