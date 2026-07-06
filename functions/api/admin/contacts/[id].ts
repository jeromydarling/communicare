// =============================================================================
// GET /api/admin/contacts/:id — full detail + unified timeline
// =============================================================================
// One request returns:
//   - the contact (user + profile + primary farm)
//   - pinned + latest notes
//   - open action items
//   - unified timeline: notes + crm_messages (outbound) + inbound SMS
//     from this user's phone + stripe_events tied to their customer id
//   - subscription snapshot
//
// The timeline is a UNION ALL of typed rows sorted by ts desc, capped
// at 200. Older entries are paginated via ?before=<iso>.
// =============================================================================

import { preflight, json } from "../../../_lib/cors";
import { requireAdmin } from "../../../_lib/admin";
import { one, many } from "../../../_lib/db";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB;
  if (!db) return json({ error: "Database not configured." }, 500);

  const id = (ctx.params?.id as string | undefined) ?? "";
  if (!id) return json({ error: "Missing contact id." }, 400);

  const user = await one<{
    id: string;
    email: string;
    display_name: string | null;
    preferred_locale: string | null;
    subscription_status: string | null;
    subscription_id: string | null;
    subscription_current_period_end: string | null;
    stripe_customer_id: string | null;
    canceled_at: string | null;
    cancel_reason: string | null;
    is_admin: number;
    created_at: string;
    email_verified_at: string | null;
  }>(
    db,
    `select id, email, display_name, preferred_locale,
            subscription_status, subscription_id,
            subscription_current_period_end, stripe_customer_id,
            canceled_at, cancel_reason,
            coalesce(is_admin, 0) as is_admin,
            created_at, email_verified_at
       from users where id = ?`,
    [id],
  );
  if (!user) return json({ error: "Not found." }, 404);

  const profile = await one<Record<string, unknown>>(
    db,
    `select id, email, display_name, phone, preferred_sms, preferred_email
       from profiles where id = ?`,
    [id],
  );

  const farms = await many<Record<string, unknown>>(
    db,
    `select f.id, f.slug, f.name, f.location, f.kind, f.is_published,
            f.onboarded_at, f.created_at, f.metadata
       from farms f
       join farm_members m on m.farm_id = f.id
      where m.user_id = ? and m.role in ('owner','staff')
        and m.archived_at is null
      order by f.created_at asc`,
    [id],
  );

  const pinnedNotes = await many<Record<string, unknown>>(
    db,
    `select id, author_user_id, body, pinned, created_at, updated_at
       from crm_notes where subject_user_id = ? and pinned = 1
       order by created_at desc`,
    [id],
  );

  const openActions = await many<Record<string, unknown>>(
    db,
    `select id, assigned_to_user_id, body, snooze_until, created_at
       from crm_action_items
      where subject_user_id = ? and done_at is null
      order by coalesce(snooze_until, created_at) asc`,
    [id],
  );

  const stripeSubs = await many<Record<string, unknown>>(
    db,
    `select id, status, price_id,
            current_period_start, current_period_end,
            cancel_at_period_end, canceled_at, trial_end,
            paused_at, resume_at, created
       from stripe_subscriptions where user_id = ?
       order by created desc`,
    [id],
  );

  // Unified timeline. All timestamps normalized as ISO. Kind tags the
  // row so the UI can render each shape.
  const url = new URL(ctx.request.url);
  const before = url.searchParams.get("before") ?? new Date(Date.now() + 60_000).toISOString();
  const timeline = await many<{
    kind: string;
    ts: string;
    id: string;
    payload: string;
  }>(
    db,
    `
    select 'note' as kind, created_at as ts, id, body as payload
      from crm_notes where subject_user_id = ? and created_at < ?
    union all
    select 'msg_' || channel as kind, created_at as ts, id,
           coalesce(subject, '') || char(10) || body as payload
      from crm_messages where subject_user_id = ? and created_at < ?
    union all
    select 'sms_in' as kind, sm.created_at as ts, sm.id, sm.body as payload
      from sms_messages sm
      join member_sms_subscriptions ms on ms.id = sm.subscription_id
     where ms.member_user_id = ? and sm.direction = 'inbound'
       and sm.created_at < ?
    union all
    select 'stripe_' || type as kind, received_at as ts, id, type as payload
      from stripe_events
     where account is null
       and json_extract(raw_json, '$.data.object.customer') = ?
       and received_at < ?
    order by ts desc
    limit 200
    `,
    [
      id, before,
      id, before,
      id, before,
      user.stripe_customer_id ?? "__none__", before,
    ],
  );

  return json({
    user,
    profile,
    farms,
    pinned_notes: pinnedNotes,
    open_actions: openActions,
    stripe_subscriptions: stripeSubs,
    timeline,
  });
};
