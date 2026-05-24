"use client";

export default function MyProfilePage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="display text-4xl font-medium mb-2">Your profile.</h1>
      <p className="text-soil/65 italic mb-8">
        How we reach you, how we deliver, and what you'd rather hear about.
      </p>

      <div className="paper p-8 space-y-5 mb-6">
        <div className="small-caps text-xs text-brick">About you</div>
        <Field label="Name" defaultValue="Sarah Whitmore" />
        <Field label="Email" type="email" defaultValue="sarah.w@example.com" hint="We use this for the magic link, never for marketing." />
        <Field label="Phone" type="tel" defaultValue="+1 540 555 0142" hint="For the weekly share text. Reply STOP any time." />
      </div>

      <div className="paper p-8 space-y-5 mb-6">
        <div className="small-caps text-xs text-brick">Pickup</div>
        <SelectField
          label="My usual pickup site"
          options={["The farm", "Donkey Coffee", "Nelsonville library"]}
          defaultValue="Donkey Coffee"
        />
        <p className="text-xs text-soil/55 italic">
          You can change this week-to-week from your Tuesday text — just reply{" "}
          <span className="font-mono not-italic">pickup farm</span>.
        </p>
      </div>

      <div className="paper p-8 space-y-3 mb-6">
        <div className="small-caps text-xs text-brick">What you want to hear</div>
        <Toggle
          label="Tuesday share text (we recommend leaving this on)"
          defaultChecked
        />
        <Toggle
          label="Pickup reminder text the day of pickup"
          defaultChecked
        />
        <Toggle label="Weekly recipe email" defaultChecked />
        <Toggle label="Farm news (the field, the cows, the harvest)" />
        <Toggle label="Communicare product updates" />
      </div>

      <div className="paper p-8 bg-brick/5 border-brick/30">
        <div className="small-caps text-xs text-brickDark mb-2">
          Leave the share
        </div>
        <h2 className="display text-xl font-medium mb-2 text-brickDark">
          Cancel your subscription.
        </h2>
        <p className="text-sm text-soil/75 mb-4">
          Your credit balance is refundable to your original payment method
          within 30 days. After that it rolls forward as a gift to next
          season's CSA fund.
        </p>
        <button className="btn text-sm text-brick border-brick hover:bg-brick hover:text-parchment">
          Cancel my share
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  type = "text",
  defaultValue,
  hint,
}: {
  label: string;
  type?: string;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="field" type={type} defaultValue={defaultValue} />
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function SelectField({
  label,
  options,
  defaultValue,
}: {
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="field" defaultValue={defaultValue}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label,
  defaultChecked,
}: {
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 w-4 h-4 accent-mossDark"
      />
      <span className="text-soil/85 text-sm">{label}</span>
    </label>
  );
}
