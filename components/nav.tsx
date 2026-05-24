import Link from "next/link";
import { Mark } from "./mark";

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
          <Link
            href="/manifesto"
            className="hover:text-brick transition-colors"
          >
            Manifesto
          </Link>
          <Link
            href="/homepage"
            className="hover:text-brick transition-colors"
          >
            Try the homepage
          </Link>
          <Link
            href="/farm/elmwood"
            className="hover:text-brick transition-colors"
          >
            See a farm
          </Link>
          <Link
            href="/find"
            className="hover:text-brick transition-colors text-soil/65"
          >
            Find a farm
          </Link>
          <Link
            href="/come-in"
            className="hover:text-brick transition-colors text-soil/65 text-sm"
          >
            Come in
          </Link>
          <Link href="/demo" className="btn btn-primary py-2 px-4 text-sm">
            Try the demo →
          </Link>
        </nav>
        <Link href="/demo" className="md:hidden btn btn-primary py-2 px-4 text-sm">
          Demo →
        </Link>
      </div>
    </header>
  );
}
