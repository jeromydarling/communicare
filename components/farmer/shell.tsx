"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mark } from "@/components/mark";
import { type AuthState, DemoBanner } from "./auth-gate";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type NavItem = {
  href: string;
  label: string;
  hint?: string;
};

const FARMER_NAV: NavItem[] = [
  { href: "/farmer/", label: "Today", hint: "what's happening" },
  { href: "/farmer/inventory/", label: "Inventory", hint: "what you're selling" },
  { href: "/farmer/roster/", label: "Pickup roster", hint: "who's coming today" },
  { href: "/farmer/members/", label: "Members", hint: "the people you feed" },
  { href: "/farmer/messages/", label: "Messages", hint: "two-way SMS inbox" },
  { href: "/farmer/emails/", label: "Emails", hint: "the newsletter" },
  { href: "/farmer/log/", label: "Harvest log", hint: "what came in from the field" },
  { href: "/farmer/analytics/", label: "Analytics", hint: "season in numbers" },
  { href: "/farmer/site/", label: "Site builder", hint: "your farm's homepage" },
  { href: "/farmer/payments/", label: "Payments", hint: "how money moves" },
  { href: "/farmer/import/", label: "Import", hint: "bring your data home" },
  { href: "/farmer/settings/", label: "Settings", hint: "everything else" },
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
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    router.push("/");
  }

  // Close the mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [menuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {auth.kind === "demo" && <DemoBanner session={auth.session} />}
      <div className="flex-1 flex">
        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex flex-col w-64 bg-soil text-parchment relative shrink-0">
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

          <nav className="relative flex-1 px-3 pb-6 overflow-y-auto">
            {FARMER_NAV.map((item) => {
              const active =
                item.href === "/farmer/"
                  ? pathname === item.href
                  : pathname === item.href ||
                    (pathname?.startsWith(item.href) ?? false);
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
        <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-soil text-parchment px-4 py-3 flex items-center justify-between border-b border-wheat/15">
          <Link href="/" className="flex items-center gap-2">
            <Mark className="w-7 h-7 text-wheat" />
            <div className="leading-none">
              <span className="display text-base">Communicare</span>
              {farmName && (
                <div className="text-[9px] text-parchment/55 small-caps mt-0.5">
                  {farmName}
                </div>
              )}
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="text-parchment display flex items-center gap-2 px-3 py-1.5 rounded-full border border-wheat/30 hover:bg-wheat/10 text-sm"
            aria-label="Open menu"
          >
            <Hamburger />
            <span>Menu</span>
          </button>
        </div>

        {/* Main */}
        <main className="flex-1 md:pl-0 pt-16 md:pt-0 min-w-0">{children}</main>
      </div>

      {/* Mobile slide-in menu */}
      {menuOpen && (
        <MobileMenu
          farmName={farmName}
          auth={auth}
          onClose={() => setMenuOpen(false)}
          onSignOut={signOut}
        />
      )}
    </div>
  );
}

function MobileMenu({
  farmName,
  auth,
  onClose,
  onSignOut,
}: {
  farmName?: string;
  auth: AuthState;
  onClose: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-soil text-parchment animate-[fade-up_200ms_ease-out]">
      <div className="absolute inset-0 bg-grain opacity-25 pointer-events-none" />
      <div className="relative px-5 py-4 border-b border-parchment/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mark className="w-8 h-8 text-wheat" />
          <div className="leading-none">
            <div className="display text-lg">Communicare</div>
            {farmName && (
              <div className="text-[10px] text-parchment/55 small-caps mt-0.5">
                Tending {farmName}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-parchment/85 hover:text-wheat display italic text-sm flex items-center gap-1"
          aria-label="Close menu"
        >
          Close
          <span className="text-xl leading-none">×</span>
        </button>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-4">
        {FARMER_NAV.map((item) => {
          const active =
            item.href === "/farmer/"
              ? pathname === item.href
              : pathname === item.href ||
                (pathname?.startsWith(item.href) ?? false);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`block px-4 py-4 rounded-md mb-1 transition-colors ${
                active
                  ? "bg-parchment/10 text-wheat"
                  : "text-parchment/85 hover:bg-parchment/5"
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="display text-lg">{item.label}</span>
                {active && (
                  <span className="text-[10px] small-caps text-wheat">Here</span>
                )}
              </div>
              {item.hint && (
                <div className="text-[11px] text-parchment/55 italic mt-0.5">
                  {item.hint}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="relative px-5 py-5 border-t border-parchment/10 text-sm text-parchment/65 flex items-center justify-between">
        {auth.kind === "authed" ? (
          <>
            <div className="truncate flex-1 mr-3">{auth.email}</div>
            <button
              type="button"
              onClick={onSignOut}
              className="display italic text-wheat/85 hover:text-wheat"
            >
              Sign out →
            </button>
          </>
        ) : (
          <>
            <div className="italic">Demo session</div>
            <Link
              href="/"
              onClick={onClose}
              className="display italic text-wheat/85 hover:text-wheat"
            >
              Back to site →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Hamburger() {
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 18 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1="0" y1="1" x2="18" y2="1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="7" x2="18" y2="7" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1.5" />
    </svg>
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
