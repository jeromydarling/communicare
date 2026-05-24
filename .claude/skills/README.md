# Communicare — installed Claude Code skills

Skills available to Claude Code in this project. They become active on the
next session start. Invoke any of them by name via the `Skill` tool, or
trigger them in conversation by referencing what they do.

## Brand & voice

| Skill | Purpose |
|---|---|
| `communicare-voice` | Lock the Rerum Novarum / Catholic Worker / Wendell Berry voice in all user-facing copy. Read before writing any landing copy, error message, marketing post, or email. |

## UI & design

| Skill | Source | Purpose |
|---|---|---|
| `frontend-design` | [anthropics/skills](https://github.com/anthropics/skills) | Anthropic's official skill for designing distinctive frontends. Use when building or styling pages and components. |
| `ss-review` | [bitjaru/styleseed](https://github.com/bitjaru/styleseed) | Review a UI file for design-system compliance, accessibility, and pattern violations. |
| `ss-audit` | bitjaru/styleseed | Nielsen 10 usability heuristics audit of a page or flow. |
| `ss-a11y` | bitjaru/styleseed | WCAG 2.2 AA accessibility audit. |
| `ss-lint` | bitjaru/styleseed | Quick scan for hardcoded colors, spacing, and other design-token violations. |
| `ss-copy` | bitjaru/styleseed | Generate UX microcopy. **Note:** for Communicare, always pair with `communicare-voice` — styleseed defaults to a generic SaaS register. |

## Testing & deployment

| Skill | Source | Purpose |
|---|---|---|
| `webapp-testing` | anthropics/skills | Headless-browser end-to-end testing patterns for the deployed site. |

## Video

| Skill | Purpose |
|---|---|
| `remotion-promo` | Build short Remotion-based promo / explainer videos in the Communicare brand. Includes brand-token port from `app/globals.css` and a six-beat 30-second template. |

## Database (for the next phase)

| Skill | Source | Purpose |
|---|---|---|
| `supabase` | [supabase/agent-skills](https://github.com/supabase/agent-skills) | Official Supabase skill — auth, Postgres, RLS, Edge Functions, migrations, security checklist. The right reference when we wire the DB. |
| `supabase-postgres-best-practices` | supabase/agent-skills | Postgres-specific best practices (RLS, schema design, performance). |

## Adding / removing skills

- Skills live at `.claude/skills/<name>/SKILL.md`. Drop new ones in this directory.
- Skills are loaded at session start; if you add or remove one mid-session,
  restart the Claude Code session to pick up the change.
- To remove a skill, just delete its directory.

## Licenses

- `frontend-design`, `webapp-testing`: Anthropic — see `LICENSE.txt` inside each skill directory.
- `supabase`, `supabase-postgres-best-practices`: Supabase — Apache 2.0.
- `ss-*` (styleseed): MIT.
- `remotion-promo`, `communicare-voice`: this project — MIT.
