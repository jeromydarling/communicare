// =============================================================================
// Canonical brand strings
// =============================================================================
// Anything hardcoded in more than one place lives here. A copy change is now
// one edit, not nine. Don't dump every UI string into this file — the
// threshold is "appears in two or more files AND a change to it should
// propagate consistently."
// =============================================================================

/** Closing blessing on confirmation and success screens. */
export const CLOSING_BLESSING = "Pax tibi.";

/** The "we'll type your binder in" inbox for the import concierge path. */
export const MIGRATE_EMAIL = "migrate@communicare.farm";

/** General help / contact inbox. */
export const SUPPORT_EMAIL = "hello@communicare.farm";

/** Convenience mailto: builder so callers don't repeat the prefix. */
export const SUPPORT_MAILTO = `mailto:${SUPPORT_EMAIL}`;
export const MIGRATE_MAILTO = `mailto:${MIGRATE_EMAIL}`;
