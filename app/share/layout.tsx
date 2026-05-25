"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthGate } from "@/components/farmer/auth-gate";
import { DemoBanner } from "@/components/farmer/auth-gate";
import { Mark } from "@/components/mark";
import { ScrollFade } from "@/components/scroll-fade";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const SHARE_NAV = [
  { href: "/share/", label: "This week" },
  { href: "/share/ticket/", label: "Ticket" },
  { href: "/share/orders/", label: "My orders" },
  { href: "/share/credit/", label: "Credit" },
  { href: "/share/statements/", label: "Statements" },
  { href: "/share/profile/", label: "Profile" },
];

export default function ShareLayout({
  children,
}: {
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
    <AuthGate>
      {(auth) => (
        <div className="min-h-screen bg-parchment flex flex-col">
          {auth.kind === "demo" && (
            <DemoBanner
              session={auth.session}
              note="You're seeing a sample member view."
            />
          )}

          {/* Member header — warm and less institutional than the farmer shell */}
          <header className="border-b border-soil/15 bg-cream">
            <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3 group">
                <Mark className="w-8 h-8 text-brick group-hover:rotate-6 transition-transform" />
                <div className="leading-none">
                  <div className="display text-lg font-medium">My share</div>
                  <div className="text-[10px] small-caps text-soil/55 -mt-0.5">
                    Wren Hollow Farm
                  </div>
                </div>
              </Link>
              {auth.kind === "authed" ? (
                <div className="text-xs text-soil/65">
                  {auth.email}
                  <button
                    onClick={signOut}
                    className="ml-3 display italic text-brick hover:underline"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <span className="text-xs italic text-soil/55">Demo session</span>
              )}
            </div>
            <ScrollFade fadeColor="cream" className="max-w-4xl mx-auto px-6">
              <nav className="flex gap-1 -mb-px">
                {SHARE_NAV.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-4 py-2 text-sm border-b-2 display whitespace-nowrap ${
                        active
                          ? "border-brick text-brick"
                          : "border-transparent text-soil/65 hover:text-soil"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </ScrollFade>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      )}
    </AuthGate>
  );
}
