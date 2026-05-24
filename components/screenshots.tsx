// Mini in-app React mockups — device-framed previews of the real app's
// screens. Pure React; no images, no screenshots-of-screenshots. They render
// at any size with crisp typography. Sprinkled through the landing page to
// give visitors something to look at while we explain.

import { Sun, Wheat, Leaf, Mark } from "@/components/mark";

// -----------------------------------------------------------------------------
// Device frames
// -----------------------------------------------------------------------------

export function PhoneFrame({
  children,
  variant = "iphone",
}: {
  children: React.ReactNode;
  variant?: "iphone" | "android";
}) {
  return (
    <div
      className="relative mx-auto"
      style={{ width: 300 }}
    >
      <div
        className="relative bg-soil rounded-[44px] p-2 shadow-[0_30px_60px_-20px_rgba(45,31,18,0.4),0_0_0_8px_rgba(45,31,18,0.06)]"
        style={{ aspectRatio: "9/19.5" }}
      >
        {/* Side buttons */}
        <div className="absolute -left-[3px] top-24 w-[3px] h-8 bg-soil/80 rounded-l" />
        <div className="absolute -left-[3px] top-40 w-[3px] h-12 bg-soil/80 rounded-l" />
        <div className="absolute -left-[3px] top-56 w-[3px] h-12 bg-soil/80 rounded-l" />
        <div className="absolute -right-[3px] top-32 w-[3px] h-16 bg-soil/80 rounded-r" />

        {/* Screen */}
        <div className="bg-parchment rounded-[36px] overflow-hidden relative h-full flex flex-col">
          {/* Notch */}
          {variant === "iphone" && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-6 bg-soil rounded-full z-20" />
          )}
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] text-soil/85 z-10">
            <span className="display font-medium">9:41</span>
            <span className="display">●●●●</span>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function BrowserFrame({
  url,
  children,
  width = 720,
}: {
  url: string;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div
      className="paper overflow-hidden mx-auto"
      style={{ maxWidth: width }}
    >
      <div className="bg-cream border-b border-soil/15 px-4 py-2.5 flex items-center gap-3">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brick/40" />
          <span className="w-2.5 h-2.5 rounded-full bg-wheat/50" />
          <span className="w-2.5 h-2.5 rounded-full bg-moss/40" />
        </div>
        <div className="text-xs text-soil/55 font-mono ml-2 truncate">{url}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SCREENSHOT №1 — SMS swap on iPhone
// -----------------------------------------------------------------------------

export function SmsSwapScreenshot() {
  return (
    <PhoneFrame>
      <div className="px-3 pt-3 pb-2 bg-cream border-b border-soil/10">
        <div className="text-center">
          <div className="display text-sm font-medium text-soil">
            Wren Hollow Farm
          </div>
          <div className="text-[10px] text-soil/55">+1 540 555 0142</div>
        </div>
      </div>
      <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto bg-parchment">
        <SmsBubble from="them" time="Mon 8:00 AM">
          Hey Sarah — your Tuesday share: kale, carrots, eggs, a chicken.
          Reply SWAP, SKIP, DONATE, or GIFT by Mon 6pm. 🌾
        </SmsBubble>
        <SmsBubble from="me" time="Mon 8:14 AM">
          swap kale for spinach
        </SmsBubble>
        <SmsBubble from="them" time="Mon 8:14 AM">
          Done. Tuesday share: spinach, carrots, eggs, a chicken.
        </SmsBubble>
        <SmsBubble from="me" time="Tue 7:22 AM">
          actually can we pause next week, we&apos;ll be away
        </SmsBubble>
        <SmsBubble from="them" time="Tue 7:22 AM">
          Paused for 1 week. We&apos;ll credit your account $36.
        </SmsBubble>
      </div>
      <div className="px-3 py-2 bg-cream border-t border-soil/10 flex items-center gap-2">
        <div className="flex-1 bg-parchment rounded-full px-3 py-1.5 text-xs text-soil/45 italic">
          Message
        </div>
        <div className="w-6 h-6 bg-sky rounded-full flex items-center justify-center text-parchment text-xs">
          ↑
        </div>
      </div>
    </PhoneFrame>
  );
}

function SmsBubble({
  from,
  time,
  children,
}: {
  from: "me" | "them";
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${from === "me" ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[80%]">
        <div
          className={`rounded-2xl px-3 py-2 text-[12px] leading-snug ${
            from === "me"
              ? "bg-sky text-parchment rounded-br-sm"
              : "bg-cream text-soil rounded-bl-sm"
          }`}
        >
          {children}
        </div>
        <div
          className={`text-[9px] text-soil/45 mt-1 ${from === "me" ? "text-right" : ""}`}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SCREENSHOT №2 — Pickup roster on iPhone (farmer view)
// -----------------------------------------------------------------------------

export function RosterScreenshot() {
  const items = [
    { name: "Sarah Whitmore", items: "kale, eggs, tomatoes", done: true },
    { name: "Tomás Reyes", items: "turnips, kale, eggs", done: true },
    { name: "Adaeze Okonkwo", items: "half-share + bouquet", done: false },
    { name: "Jonas Roth", items: "standard share", done: false },
    { name: "Mei Chen", items: "salad mix, scallions", done: false },
  ];

  return (
    <PhoneFrame>
      <div className="px-4 pt-2 pb-3 bg-soil text-parchment">
        <div className="text-[9px] small-caps text-wheat">Tuesday roster</div>
        <div className="display text-lg leading-tight mt-0.5">
          Donkey Coffee
        </div>
        <div className="text-[10px] text-parchment/55 mt-0.5">
          5 of 12 picked up · 3–7 pm
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-parchment">
        {items.map((row, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 border-b border-soil/8 ${row.done ? "bg-moss/5" : ""}`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] ${
                row.done
                  ? "bg-mossDark border-mossDark text-parchment"
                  : "border-soil/25"
              }`}
            >
              {row.done && "✓"}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`display text-sm ${row.done ? "line-through text-soil/45" : ""}`}
              >
                {row.name}
              </div>
              <div className="text-[10px] text-soil/55 truncate italic">
                {row.items}
              </div>
            </div>
            <button className="text-[10px] text-brick px-2 py-1 border border-brick/30 rounded-full display italic">
              Text
            </button>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-cream border-t border-soil/10 flex gap-2">
        <button className="flex-1 text-[11px] text-soil/65 display py-1.5">
          Add walk-in
        </button>
        <button className="flex-1 text-[11px] text-brick display py-1.5 border-l border-soil/10">
          Donate leftover
        </button>
      </div>
    </PhoneFrame>
  );
}

// -----------------------------------------------------------------------------
// SCREENSHOT №3 — Inventory tap-to-sold-out on browser
// -----------------------------------------------------------------------------

export function InventoryScreenshot() {
  const items = [
    { name: "Lacinato kale", left: 62, cap: 80, soldOut: false },
    { name: "Pastured eggs", left: 0, cap: 40, soldOut: true },
    { name: "Hakurei turnips", left: 38, cap: 50, soldOut: false },
    { name: "Sunflowers", left: 25, cap: 25, soldOut: false },
  ];
  return (
    <BrowserFrame url="wren-hollow.communicare.farm/farmer/inventory">
      <div className="bg-cream p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] small-caps text-brick">
              What you're selling this week
            </div>
            <div className="display text-2xl font-medium">Inventory.</div>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="px-2 py-1 rounded-full bg-brick/15 text-brick display">
              1 sold out
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {items.map((it, i) => (
            <div
              key={i}
              className={`bg-parchment border border-soil/10 rounded p-3 ${it.soldOut ? "opacity-60" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="display text-sm">{it.name}</div>
                <div className="text-[10px] text-soil/55">
                  {it.soldOut ? "Sold out" : `${it.left}/${it.cap}`}
                </div>
              </div>
              <div className="h-1 bg-soil/10 rounded-full">
                <div
                  className={`h-full rounded-full ${
                    it.soldOut
                      ? "bg-brick/60"
                      : it.left / it.cap < 0.3
                        ? "bg-wheat"
                        : "bg-moss"
                  }`}
                  style={{
                    width: `${it.soldOut ? 100 : (it.left / it.cap) * 100}%`,
                  }}
                />
              </div>
              <button
                className={`mt-2 w-full text-[10px] py-1 rounded border display ${
                  it.soldOut
                    ? "border-moss text-mossDark"
                    : "border-soil/20 text-soil/55 hover:border-brick hover:text-brick"
                }`}
              >
                {it.soldOut ? "Back in stock" : "Mark sold out"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </BrowserFrame>
  );
}

// -----------------------------------------------------------------------------
// SCREENSHOT №4 — AI homepage generator preview, mid-generation
// -----------------------------------------------------------------------------

export function HomepageGeneratorScreenshot() {
  return (
    <BrowserFrame url="communicare.farm/homepage">
      <div className="bg-parchment p-5 grid grid-cols-5 gap-4">
        <div className="col-span-2">
          <div className="text-[10px] small-caps text-brick">Tell us</div>
          <div className="display text-sm font-medium mb-3">Your farm.</div>
          <div className="space-y-2">
            {[
              { label: "Farm name", value: "Wren Hollow Farm" },
              { label: "Location", value: "Floyd County, Virginia" },
              { label: "What you grow", value: "Vegetables, dairy, eggs" },
            ].map((f, i) => (
              <div key={i}>
                <div className="text-[9px] text-soil/55 small-caps">
                  {f.label}
                </div>
                <div className="text-[10px] text-soil bg-cream border border-soil/15 rounded px-2 py-1">
                  {f.value}
                </div>
              </div>
            ))}
            <div className="pt-2">
              <div className="bg-soil text-parchment text-[10px] display px-3 py-1.5 rounded-full inline-block">
                Generate →
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-3 bg-cream border border-soil/15 rounded p-3">
          <div className="text-[9px] text-soil/45 mb-1 font-mono">
            wren-hollow.communicare.farm
          </div>
          <div className="display text-base font-medium leading-tight">
            A hundred acres, kept by two of us.
          </div>
          <div className="text-[10px] italic text-soil/55 mt-1">
            Floyd County, Virginia
          </div>
          <p className="text-[10px] mt-2 text-soil/85 leading-snug">
            Hannah and Ben came home in 2017 with a baby and no farming
            experience. They keep five Jerseys, forty hens, and a vegetable
            plot that's grown a little every year. They don't till. They
            don't spray. The cows know their names.
          </p>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {["Vegetables year-round", "Herd-share milk", "Eggs while they last"].map(
              (l, i) => (
                <div key={i}>
                  <div className="text-[9px] small-caps text-wheat">
                    № {i + 1}
                  </div>
                  <div className="text-[10px] display leading-tight">{l}</div>
                </div>
              ),
            )}
          </div>
          <div className="text-center text-[9px] display italic text-brick mt-3">
            We will see you in the spring.
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

// -----------------------------------------------------------------------------
// SCREENSHOT №5 — This week's share card, ready to post to Instagram
// -----------------------------------------------------------------------------

export function ShareCardScreenshot() {
  return (
    <div
      className="mx-auto relative overflow-hidden grain-overlay"
      style={{ width: 280, aspectRatio: "1/1" }}
    >
      <div className="absolute inset-0 bg-cream" />
      <div className="relative h-full flex flex-col p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="small-caps text-[10px] text-brick">
              This week at
            </div>
            <div className="display text-lg font-medium leading-tight">
              Wren Hollow Farm
            </div>
          </div>
          <Sun className="w-9 h-9 text-wheat" />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <ul className="space-y-1.5 text-sm">
            {[
              "Lacinato kale",
              "Hakurei turnips",
              "Sungold tomatoes",
              "Spring onions",
              "Pastured eggs",
              "Sunflower bouquet",
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-wheat display text-xs">❀</span>
                <span className="text-soil/85">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center text-[10px] text-soil/65 italic display">
          Pick up Tuesday · 3–7 pm
        </div>
        <div className="rule my-2" />
        <div className="flex items-center justify-between text-[9px] text-soil/55">
          <div className="flex items-center gap-1">
            <Mark className="w-3 h-3 text-brick" />
            <span className="display">wren-hollow.communicare.farm</span>
          </div>
          <span className="small-caps">№ 18</span>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// SCREENSHOT №6 — Come-in magic-link landing on iPhone
// -----------------------------------------------------------------------------

export function ComeInScreenshot() {
  return (
    <PhoneFrame>
      <div className="flex-1 flex flex-col items-center justify-center px-6 bg-parchment text-center">
        <Sun className="w-10 h-10 text-wheat mb-4" />
        <div className="small-caps text-[9px] text-brick mb-2">Come in</div>
        <h2 className="display text-xl font-medium mb-2 leading-tight">
          Welcome back.
        </h2>
        <p className="text-[11px] text-soil/65 italic mb-5">
          We sent a magic link to{" "}
          <span className="display not-italic">sarah.w@example.com</span>.
          Tap it and we&apos;ll let you in.
        </p>
        <div className="paper px-4 py-3 w-full">
          <div className="text-[10px] text-soil/55 mb-1">From: Wren Hollow</div>
          <div className="display text-xs mb-1">Your magic link, Sarah</div>
          <div className="text-[10px] text-brick display italic">
            Tap here to sign in →
          </div>
        </div>
        <div className="text-[9px] text-soil/45 mt-4 italic">
          Good for one hour, on one device.
        </div>
      </div>
    </PhoneFrame>
  );
}
