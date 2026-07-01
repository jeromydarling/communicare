import Link from "next/link";
import { Mark } from "./mark";
import { CLOSING_BLESSING } from "@/lib/brand-strings";
import { CROS_URL, CROS_SHORT } from "@/lib/site";

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
                <Link href="/farmer/sign-up" className="hover:text-brick">
                  Start your farm
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-brick">
                  Open the demo
                </Link>
              </li>
              <li>
                <Link href="/homepage" className="hover:text-brick">
                  Draft a homepage
                </Link>
              </li>
              <li>
                <Link href="/manifesto" className="hover:text-brick">
                  Read the manifesto
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
                <Link href="/find" className="hover:text-brick">
                  Find a farm near you
                </Link>
              </li>
              <li>
                <Link href="/farm/elmwood" className="hover:text-brick">
                  Read a farm's page
                </Link>
              </li>
              <li>
                <Link href="/come-in" className="hover:text-brick">
                  Sign in to your share
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="rule my-10" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-soil/60">
          <div>
            <span className="display italic">{CLOSING_BLESSING}</span> Built by hand, in
            the United States, for the farms that hold the country together.
          </div>
          <div className="small-caps text-xs">
            No tracking. No ads. No data sold. Ever.
          </div>
        </div>

        {/* CROS™ family attribution — small line, last thing on the page */}
        <div className="mt-8 pt-6 border-t border-soil/10 text-xs text-soil/55 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            A member of the{" "}
            <a
              href={CROS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="display not-italic hover:text-brick"
            >
              CROS<sup className="text-[8px] -top-1.5">™</sup>
            </a>{" "}
            family of apps — {CROS_SHORT.replace(/\.$/, "").toLowerCase()}.
          </div>
          <a
            href={CROS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="display italic text-brick hover:underline whitespace-nowrap"
          >
            thecros.app →
          </a>
        </div>
      </div>
    </footer>
  );
}
