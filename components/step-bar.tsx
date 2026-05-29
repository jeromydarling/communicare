// =============================================================================
// StepBar — generic wizard step indicator
// =============================================================================
// Two wizards (/farmer/onboarding and /farmer/import) used to embed a
// near-identical inner component. Extracted here so a copy change to the
// shape (icon, fonts, separator) only touches one file.
// =============================================================================

type StepBarProps = {
  steps: readonly string[];
  current: number;
};

export function StepBar({ steps, current }: StepBarProps) {
  return (
    <ol className="flex items-center gap-2 flex-wrap">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full grid place-items-center text-xs display border ${
                  state === "active"
                    ? "bg-brick text-parchment border-brick"
                    : state === "done"
                      ? "bg-mossDark text-parchment border-mossDark"
                      : "bg-parchment text-soil/45 border-soil/20"
                }`}
              >
                {state === "done" ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs display ${state === "active" ? "text-soil" : "text-soil/45"}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="text-soil/20 mx-1 hidden sm:inline">·····</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
