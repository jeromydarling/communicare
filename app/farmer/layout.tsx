"use client";

import { AuthGate } from "@/components/farmer/auth-gate";
import { FarmerShell } from "@/components/farmer/shell";
import { demoFarm } from "@/lib/farmer-demo";

// Auth-gated client layout. In demo mode (no Supabase configured), shows
// the demo farm and demo data. Authed users see their farm data.
//
// We deliberately skip Nav/Footer from app/layout.tsx by having the
// dashboard live under /farmer/* with its own shell. The top-level layout's
// Nav + Footer still wrap us, which is fine — we just provide our own
// chrome on top.

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      {(auth) => (
        <FarmerShell auth={auth} farmName={demoFarm.name}>
          {children}
        </FarmerShell>
      )}
    </AuthGate>
  );
}
