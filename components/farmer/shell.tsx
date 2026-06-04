"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mark } from "@/components/mark";
import { type AuthState, DemoBanner } from "./auth-gate";
import { signOut as authSignOut } from "@/lib/auth/client";

type NavItem = {
  href: string;
  label: string;
  hint?: string;
};

const FARMER_NAV: NavItem[] = [
  { href: "/farmer/", label: "Today", hint: "what's happening" },
  { href: "/farmer/inventory/", label: "Inventory", hint: "what you're selling" },
  { href: "/farmer/roster/", label: "Pickup roster", hint: "who's coming today" },
  { href: "/farmer/catch-weight/", label: "Catch-weight", hint: "hanging-weight reconciliation" },
  { href: "/farmer/herd-share/", label: "Herd-share", hint: "contracts + milk tests" },
  { href: "/farmer/members/", label: "Members", hint: "the people you feed" },
  { href: "/farmer/messages/", label: "Messages", hint: "two-way SMS inbox" },
  { href: "/farmer/emails/", label: "Emails", hint: "the newsletter" },
  { href: "/farmer/share-cards/", label: "Share cards", hint: "Instagram-ready posters" },
  { href: "/farmer/log/", label: "Harvest log", hint: "what came in from the field" },
  { href: "/farmer/analytics/", label: "Analytics", hint: "season in numbers" },
  { href: "/farmer/site/", label: "Site builder", hint: "your farm's homepage" },
  { href: "/farmer/payments/", label: "Payments", hint: "how money moves" },
  { href: "/farmer/accounting/", label: "Accounting", hint: "QuickBooks · Wave · CSV" },
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
    await authSignOut();
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
        <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-parchment text-soil px-4 py-3 flex items-center justify-between border-b border-outline">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-brick text-parchment grid place-items-center font-mono text-base font-medium">
              C
            </div>
            <div className="leading-tight">
              <div className="display text-lg font-medium">Communicare</div>
              <div className="text-[9px] small-caps text-brick">
                The agrarian almanac
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <RoleToggle />
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="text-soil hover:text-brick"
              aria-label="Open menu"
            >
              <Hamburger />
            </button>
          </div>
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
    <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-parchment text-soil animate-[fade-up_200ms_ease-out]">
      <div className="px-5 py-4 border-b border-outline flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brick text-parchment grid place-items-center font-mono text-base font-medium">
            C
          </div>
          <div className="leading-tight">
            <div className="display text-lg font-medium">Communicare</div>
            <div className="text-[10px] small-caps text-brick">
              The agrarian almanac
            </div>
            {farmName && (
              <div className="text-[10px] small-caps text-soil/55 mt-1">
                Tending {farmName}
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-soil/65 hover:text-brick text-sm flex items-center gap-1 small-caps"
          aria-label="Close menu"
        >
          Close
          <span className="text-xl leading-none -mt-0.5">×</span>
        </button>
      </div>

      <div className="px-5 py-4">
        <RoleToggle />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="paper p-2">
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
                className={`flex items-center gap-3 px-3 py-3.5 rounded-md transition-colors ${
                  active
                    ? "bg-cream text-brick"
                    : "text-soil hover:bg-cream/60"
                }`}
              >
                <NavIcon name={item.label} active={active} />
                <span
                  className={`small-caps text-sm flex-1 tracking-[0.12em] ${active ? "text-brick" : "text-soil/85"}`}
                >
                  {item.label}
                </span>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brick" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="px-5 py-4 border-t border-outline text-sm text-soil/65 flex items-center justify-between">
        {auth.kind === "authed" ? (
          <>
            <div className="truncate flex-1 mr-3">{auth.email}</div>
            <button
              type="button"
              onClick={onSignOut}
              className="display italic text-brick hover:underline"
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
              className="display italic text-brick hover:underline"
            >
              Back to site →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

// Lightweight outline icons for the mobile nav list. Hand-rolled SVGs match
// the geometric / Linear-style mark in the reference. Single weight, one
// stroke, no fills.
function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "#C16850" : "#1A1410";
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    stroke,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "Today":
      return (
        <svg {...props}>
          <rect x="3" y="4.5" width="14" height="13" rx="2" />
          <line x1="3" y1="8.5" x2="17" y2="8.5" />
          <line x1="6.5" y1="2.5" x2="6.5" y2="6" />
          <line x1="13.5" y1="2.5" x2="13.5" y2="6" />
        </svg>
      );
    case "Inventory":
      return (
        <svg {...props}>
          <rect x="3" y="6.5" width="14" height="10" rx="1.5" />
          <path d="M7 6.5V4a3 3 0 0 1 6 0v2.5" />
        </svg>
      );
    case "Pickup roster":
      return (
        <svg {...props}>
          <rect x="4" y="3" width="12" height="14" rx="1.5" />
          <line x1="7" y1="7" x2="13" y2="7" />
          <line x1="7" y1="10.5" x2="13" y2="10.5" />
          <line x1="7" y1="14" x2="11" y2="14" />
        </svg>
      );
    case "Members":
      return (
        <svg {...props}>
          <circle cx="7" cy="7.5" r="2.5" />
          <path d="M2.5 16.5c.5-2.4 2.4-4 4.5-4s4 1.6 4.5 4" />
          <circle cx="14" cy="8" r="2" />
          <path d="M12.5 16.5c.4-1.6 1.7-3 3.5-3s2.5 1 2.5 2" />
        </svg>
      );
    case "Messages":
      return (
        <svg {...props}>
          <path d="M3 5h14v9H7l-4 3.5V5z" />
        </svg>
      );
    case "Emails":
      return (
        <svg {...props}>
          <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
          <path d="M2.5 6l7.5 5.5L17.5 6" />
        </svg>
      );
    case "Harvest log":
      return (
        <svg {...props}>
          <path d="M10 4v13" />
          <path d="M10 8c-2-2-4-2-5-1 1 2 3 3 5 3" />
          <path d="M10 11c2-2 4-2 5-1-1 2-3 3-5 3" />
        </svg>
      );
    case "Analytics":
      return (
        <svg {...props}>
          <line x1="3" y1="17" x2="17" y2="17" />
          <rect x="4" y="11" width="2.5" height="6" />
          <rect x="9" y="7" width="2.5" height="10" />
          <rect x="14" y="9" width="2.5" height="8" />
        </svg>
      );
    case "Site builder":
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="7" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <path d="M10 3c2.5 2 2.5 12 0 14" />
          <path d="M10 3c-2.5 2-2.5 12 0 14" />
        </svg>
      );
    case "Payments":
      return (
        <svg {...props}>
          <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
          <line x1="2.5" y1="8.5" x2="17.5" y2="8.5" />
        </svg>
      );
    case "Import":
      return (
        <svg {...props}>
          <path d="M10 3v9" />
          <path d="M6.5 9.5L10 13l3.5-3.5" />
          <rect x="3.5" y="14.5" width="13" height="2.5" rx="0.5" />
        </svg>
      );
    case "Settings":
      return (
        <svg {...props}>
          <circle cx="10" cy="10" r="2" />
          <path d="M10 2v2M10 16v2M18 10h-2M4 10H2M15.5 4.5l-1.5 1.5M6 14l-1.5 1.5M15.5 15.5l-1.5-1.5M6 6L4.5 4.5" />
        </svg>
      );
    default:
      return <svg {...props} />;
  }
}

function Hamburger() {
  return (
    <svg
      width="22"
      height="18"
      viewBox="0 0 22 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <line x1="0" y1="1" x2="22" y2="1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="9" x2="22" y2="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="0" y1="17" x2="22" y2="17" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

// Segmented Member / Farmer view toggle — sits in the header so a farmer
// can flip to the share-holder dashboard with one tap to see what their
// members see.
function RoleToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const isFarmer = pathname?.startsWith("/farmer") ?? true;
  return (
    <div
      role="tablist"
      className="inline-flex items-center bg-cream/60 rounded-full p-0.5 border border-outline"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!isFarmer}
        onClick={() => router.push("/share/")}
        className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase transition-colors ${
          !isFarmer ? "bg-soil text-parchment" : "text-soil/65 hover:text-soil"
        }`}
      >
        Member
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isFarmer}
        onClick={() => router.push("/farmer/")}
        className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase transition-colors ${
          isFarmer ? "bg-brick text-parchment" : "text-soil/65 hover:text-soil"
        }`}
      >
        Farmer
      </button>
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
