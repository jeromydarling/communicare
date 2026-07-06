// =============================================================================
// GET /api/admin/contacts — the CRM roster
// =============================================================================
// One row per user with the fields we sort/filter/tag by. Includes the
// primary farm's lat/lng so the map view can render without a second
// query. Cheap to hit; the whole table is small.
//
// Query params:
//   ?status=active|paused|past_due|canceled|unpaid
//   ?q=<substring>        matches email or farm name (case-insensitive)
//   ?limit=<1..500>       default 200
//   ?offset=<N>
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { requireAdmin } from "../../_lib/admin";
import { many } from "../../_lib/db";

type Env = {
  DB?: D1Database;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
};

type ContactRow = {
  id: string;
  email: string;
  display_name: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  farm_id: string | null;
  farm_slug: string | null;
  farm_name: string | null;
  farm_location: string | null;
  farm_kind: string | null;
  farm_is_published: number | null;
  farm_lat: number | null;
  farm_lng: number | null;
  open_actions: number;
  last_activity_at: string | null;
};

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB;
  if (!db) return json({ error: "Database not configured." }, 500);

  const url = new URL(ctx.request.url);
  const statusFilter = url.searchParams.get("status");
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = clamp(parseInt(url.searchParams.get("limit") ?? "200", 10), 1, 500);
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));

  const clauses: string[] = [];
  const params: unknown[] = [];
  if (statusFilter) {
    clauses.push(`coalesce(u.subscription_status,'unpaid') = ?`);
    params.push(statusFilter);
  }
  if (q) {
    clauses.push(
      `(lower(u.email) like ? or lower(coalesce(f.name,'')) like ? or lower(coalesce(u.display_name,'')) like ?)`,
    );
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  const where = clauses.length ? `where ${clauses.join(" and ")}` : "";

  // Join the primary farm (first owner/staff row for the user) and pull
  // open-action count + last activity in the same query.
  const sql = `
    select
      u.id,
      u.email,
      u.display_name,
      u.subscription_status,
      u.subscription_current_period_end,
      u.canceled_at,
      u.cancel_reason,
      u.created_at,
      f.id            as farm_id,
      f.slug          as farm_slug,
      f.name          as farm_name,
      f.location      as farm_location,
      f.kind          as farm_kind,
      f.is_published  as farm_is_published,
      f.metadata      as farm_metadata_json,
      f.created_at    as farm_created_at,
      (select count(*) from crm_action_items ai
        where ai.subject_user_id = u.id and ai.done_at is null) as open_actions,
      coalesce(
        (select max(created_at) from crm_notes where subject_user_id = u.id),
        (select max(created_at) from crm_messages where subject_user_id = u.id),
        (select max(sent_at) from sms_messages sm
           join member_sms_subscriptions ms on ms.id = sm.subscription_id
          where ms.member_user_id = u.id)
      ) as last_activity_at
      from users u
      left join farm_members fm
        on fm.user_id = u.id and fm.role in ('owner','staff')
        and fm.archived_at is null
      left join farms f on f.id = fm.farm_id
      ${where}
      order by u.created_at desc
      limit ? offset ?
  `;
  params.push(limit, offset);

  const rows = await many<Record<string, unknown>>(db, sql, params);
  const contacts: ContactRow[] = rows.map((r) => {
    let lat: number | null = null;
    let lng: number | null = null;
    // Some farm rows keep coords in metadata JSON — parse best-effort.
    const meta = r.farm_metadata_json;
    if (typeof meta === "string") {
      try {
        const parsed = JSON.parse(meta) as { lat?: number; lng?: number };
        if (typeof parsed.lat === "number") lat = parsed.lat;
        if (typeof parsed.lng === "number") lng = parsed.lng;
      } catch {
        /* ignore */
      }
    }
    return {
      id: r.id as string,
      email: r.email as string,
      display_name: (r.display_name as string | null) ?? null,
      subscription_status: (r.subscription_status as string | null) ?? "unpaid",
      subscription_current_period_end:
        (r.subscription_current_period_end as string | null) ?? null,
      canceled_at: (r.canceled_at as string | null) ?? null,
      cancel_reason: (r.cancel_reason as string | null) ?? null,
      created_at: r.created_at as string,
      farm_id: (r.farm_id as string | null) ?? null,
      farm_slug: (r.farm_slug as string | null) ?? null,
      farm_name: (r.farm_name as string | null) ?? null,
      farm_location: (r.farm_location as string | null) ?? null,
      farm_kind: (r.farm_kind as string | null) ?? null,
      farm_is_published: (r.farm_is_published as number | null) ?? null,
      farm_lat: lat,
      farm_lng: lng,
      open_actions: (r.open_actions as number) ?? 0,
      last_activity_at: (r.last_activity_at as string | null) ?? null,
    };
  });

  return json({ contacts, limit, offset, count: contacts.length });
};

function clamp(n: number, lo: number, hi: number): number {
  const i = Math.round(n);
  if (!Number.isFinite(i)) return lo;
  return Math.max(lo, Math.min(hi, i));
}
