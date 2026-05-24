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
          <Link href="/join" className="btn btn-ghost py-2 px-4 text-sm">
            Join the circle
          </Link>
        </nav>
        <Link href="/join" className="md:hidden btn btn-ghost py-2 px-4 text-sm">
          Join
        </Link>
      </div>
    </header>
  );
}
