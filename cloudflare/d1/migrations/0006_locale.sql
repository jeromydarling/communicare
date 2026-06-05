-- =============================================================================
-- 0006_locale — per-user preferred language + token locale
-- =============================================================================
-- Adds preferred_locale to users (defaults 'en'; signup populates from
-- Accept-Language). Magic-link tokens carry the locale they were
-- minted under so the click-through landing page can route to the
-- right language even if the user agent has changed.
-- =============================================================================

alter table users
  add column preferred_locale text not null default 'en'
  check (preferred_locale in ('en', 'es'));

alter table magic_link_tokens
  add column locale text not null default 'en'
  check (locale in ('en', 'es'));
