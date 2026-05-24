"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark, Wheat, Sun } from "@/components/mark";
import { type AuthState, DemoBanner } from "./auth-gate";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  hint?: string;
};

const FARMER_NAV: NavItem[] = [
  { href: "/farmer/", label: "Today", hint: "what's happening" },
  { href: "/farmer/inventory/", label: "Inventory" },
  { href: "/farmer/roster/", label: "Pickup roster" },
  { href: "/farmer/members/", label: "Members" },
  { href: "/farmer/messages/", label: "Messages" },
  { href: "/farmer/homepage/", label: "Homepage" },
  { href: "/farmer/payments/", label: "Payments" },
  { href: "/farmer/settings/", label: "Settings" },
];

export function FarmerShell({
  auth,
  farmName,
  children,
}: {
  auth: AuthState;
  farmName?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {auth.kind === "demo" && <DemoBanner session={auth.session} />}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-soil text-parchment relative">
          <div className="absolute inset-0 bg-grain opacity-30 pointer-events-none" />
          <div className="relative p-6">
            <Link href="/" className="flex items-center gap-3 group">
              <Mark className="w-9 h-9 text-wheat group-hover:rotate-6 transition-transform" />
              <div className="leading-none">
                <div className="display text-xl font-medium">Communicare</div>
                <div className="text-[9px] small-caps text-parchment/55 -mt-0.5">
                  for the farms that feed us
                </div>
              </div>
            </Link>
          </div>

          {farmName && (
            <div className="px-6 pb-5 mb-2 border-b border-parchment/10 relative">
              <div className="text-[10px] small-caps text-parchment/55">
                Tending
              </div>
              <div className="display text-lg leading-tight mt-1">{farmName}</div>
            </div>
          )}

          <nav className="relative flex-1 px-3 pb-6">
            {FARMER_NAV.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(item.href + "");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2.5 rounded-md text-[0.95rem] mb-0.5 transition-colors ${
                    active
                      ? "bg-parchment/10 text-wheat"
                      : "text-parchment/75 hover:bg-parchment/5 hover:text-parchment"
                  }`}
                >
                  <span className="display">{item.label}</span>
                  {item.hint && (
                    <span className="text-[10px] text-parchment/45 italic ml-2">
                      {item.hint}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="relative px-6 py-5 border-t border-parchment/10 text-xs text-parchment/55">
            {auth.kind === "authed" ? (
              <>
                <div className="truncate mb-1">{auth.email}</div>
                <button
                  type="button"
                  onClick={signOut}
                  className="display italic text-wheat/85 hover:text-wheat"
                >
                  Sign out →
                </button>
              </>
            ) : (
              <div className="italic">Demo session</div>
            )}
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-soil text-parchment px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Mark className="w-7 h-7 text-wheat" />
            <span className="display text-lg">Communicare</span>
          </Link>
          {auth.kind === "authed" && (
            <button onClick={signOut} className="text-xs display italic text-wheat/85">
              Sign out
            </button>
          )}
        </div>

        {/* Main */}
        <main className="flex-1 md:pl-0 pt-16 md:pt-0">{children}</main>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-soil text-parchment border-t border-wheat/20 grid grid-cols-4 text-[10px]">
        {FARMER_NAV.slice(0, 4).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-3 text-center ${active ? "text-wheat" : "text-parchment/65"}`}
            >
              <div className="display">{item.label}</div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-soil/10 px-6 md:px-10 py-8 flex items-end justify-between gap-4 flex-wrap">
      <div>
        {eyebrow && (
          <div className="small-caps text-xs text-brick mb-2">{eyebrow}</div>
        )}
        <h1 className="display text-4xl md:text-5xl font-medium leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-soil/65 max-w-xl">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
