import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// Wraps all public marketing + member-discovery pages with the editorial
// Nav and Footer. Farmer and member dashboards skip this entirely.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
