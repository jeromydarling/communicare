"use client";

import { useId, useState } from "react";

// =============================================================================
// PasswordInput — show/hide toggle + live strength meter
// =============================================================================
// One component, used everywhere we ask a farm operator to type or set a
// password. Keeps the rules visible (not hidden behind a tooltip) so the
// user knows what they need without guessing. The score function is a
// small heuristic — not zxcvbn — so the bundle stays light.
//
// Pass `showStrength` to render the meter (sign-up + reset flows) or
// leave it off for sign-in (no meter, just show/hide).
// =============================================================================

const REQUIREMENTS = [
  { label: "12 characters or more", test: (p: string) => p.length >= 12 },
  { label: "a lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "an uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "a number", test: (p: string) => /\d/.test(p) },
] as const;

export type PasswordScore = 0 | 1 | 2 | 3 | 4;

export function scorePassword(p: string): PasswordScore {
  if (!p) return 0;
  let n = 0;
  for (const r of REQUIREMENTS) if (r.test(p)) n++;
  // Bonus point for an unusual character beyond the four basics.
  if (n === 4 && /[^A-Za-z0-9]/.test(p)) n = 4;
  return Math.min(n, 4) as PasswordScore;
}

export function isPasswordStrongEnough(p: string): boolean {
  return scorePassword(p) >= 4;
}

const SCORE_COPY: Record<PasswordScore, { label: string; tone: string }> = {
  0: { label: "—", tone: "bg-soil/15 text-soil/45" },
  1: { label: "Too short", tone: "bg-brick/70 text-brick" },
  2: { label: "Weak", tone: "bg-wheat text-wheatDark" },
  3: { label: "Almost there", tone: "bg-wheat text-wheatDark" },
  4: { label: "Strong", tone: "bg-moss text-mossDark" },
};

type PasswordInputProps = {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  showStrength?: boolean;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  id?: string;
  autoFocus?: boolean;
};

export function PasswordInput({
  value,
  onChange,
  label = "Password",
  placeholder = "",
  autoComplete = "current-password",
  showStrength = false,
  required = false,
  disabled = false,
  hint,
  id,
  autoFocus,
}: PasswordInputProps) {
  const reactId = useId();
  const inputId = id ?? `pw-${reactId}`;
  const [visible, setVisible] = useState(false);
  const score = showStrength ? scorePassword(value) : 0;
  const meta = SCORE_COPY[score];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
        {showStrength && value && (
          <span
            className={`small-caps text-[10px] px-2 py-0.5 rounded-full ${meta.tone}`}
          >
            {meta.label}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className="field pr-12 font-mono"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-soil/55 hover:text-soil text-xs display italic px-2 py-1"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      {hint && (
        <p className="text-[11px] text-soil/55 italic mt-1.5 leading-snug">
          {hint}
        </p>
      )}

      {showStrength && (
        <>
          <div className="flex gap-1 mt-2.5" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  score > i
                    ? score === 4
                      ? "bg-moss"
                      : score >= 2
                        ? "bg-wheat"
                        : "bg-brick"
                    : "bg-soil/10"
                }`}
              />
            ))}
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            {REQUIREMENTS.map((r) => {
              const ok = r.test(value);
              return (
                <li
                  key={r.label}
                  className={`flex items-center gap-1.5 ${
                    ok ? "text-mossDark" : "text-soil/55"
                  }`}
                >
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      ok ? "bg-mossDark" : "bg-soil/20"
                    }`}
                  />
                  {r.label}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
