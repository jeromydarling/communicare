import Link from "next/link";
import { Mark } from "./mark";

// Four nav items + one conversion CTA. Each label tells you exactly what
// you get on the other side. Old labels ("Try the homepage", "See a farm",
// "Come in") were either confusing or wrapped to two lines on common
// desktop widths — kept the link targets, renamed the strings.
const ITEMS = [
  { href: "/find", label: "Find a farm" },
  { href: "/demo", label: "Demo" },
  { href: "/manifesto", label: "Manifesto" },
];

export function Nav() {
  return (
    <header className="border-b border-soil/10 bg-parchment/85 backdrop-blur sticky top-0 z-50">
      <div className="max-w-page mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <Mark className="w-9 h-9 text-brick group-hover:rotate-6 transition-transform" />
          <div className="leading-none">
            <div className="display text-2xl font-medium tracking-tight">
              Communicare
            </div>
            <div className="text-[10px] small-caps text-soil/55 -mt-0.5">
              for the farms that feed us
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[0.95rem]">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-brick transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/come-in"
            className="hover:text-brick transition-colors text-soil/60 text-sm whitespace-nowrap"
          >
            Sign in
          </Link>
          <Link
            href="/farmer/sign-up"
            className="btn btn-primary py-2 px-4 text-sm whitespace-nowrap"
          >
            Start your farm →
          </Link>
        </nav>

        <Link
          href="/farmer/sign-up"
          className="md:hidden btn btn-primary py-2 px-4 text-sm whitespace-nowrap"
        >
          Start →
        </Link>
      </div>
    </header>
  );
}
