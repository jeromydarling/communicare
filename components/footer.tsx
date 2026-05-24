import Link from "next/link";
import { Mark } from "./mark";

export function Footer() {
  return (
    <footer className="border-t border-soil/15 bg-cream mt-24">
      <div className="max-w-page mx-auto px-6 py-14">
        <div className="grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Mark className="w-8 h-8 text-brick" />
              <span className="display text-xl font-medium">Communicare</span>
            </div>
            <p className="text-soil/75 leading-relaxed">
              From the Latin <em>communicare</em> — to share, to commune, to
              make common. A small tool placed in the hands of the farms that
              feed us, offered as a gift to the work of feeding one another.
            </p>
          </div>
          <div>
            <div className="small-caps text-xs text-soil/55 mb-3">
              For farmers
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/homepage" className="hover:text-brick">
                  Generate your homepage
                </Link>
              </li>
              <li>
                <Link href="/manifesto" className="hover:text-brick">
                  Read why we built this
                </Link>
              </li>
              <li>
                <Link href="/join" className="hover:text-brick">
                  Join the early circle
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="small-caps text-xs text-soil/55 mb-3">
              For neighbors
            </div>
            <ul className="space-y-2">
              <li>
                <Link href="/farm/elmwood" className="hover:text-brick">
                  See a sample farm
                </Link>
              </li>
              <li>
                <span className="text-soil/55">
                  Discovery map — coming, last
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="rule my-10" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-soil/60">
          <div>
            <span className="display italic">Pax tibi.</span> Built by hand, in
            the United States, for the farms that hold the country together.
          </div>
          <div className="small-caps text-xs">
            No tracking. No ads. No data sold. Ever.
          </div>
        </div>
      </div>
    </footer>
  );
}
