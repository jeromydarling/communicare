// =============================================================================
// /api/admin/actions — action items (todos) attached to a contact
// =============================================================================
//   POST   create             body: { subject_user_id, body, snooze_until? }
//   PUT   ?id=…               body: { body?, snooze_until?, done? }
//   DELETE ?id=…
//   GET   ?assigned_to=me     open items for the caller
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { requireAdmin } from "../../_lib/admin";
import { many, run, uuid, nowIso } from "../../_lib/db";

type Env = { DB?: D1Database; SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB!;

  const url = new URL(ctx.request.url);
  const assignedTo = url.searchParams.get("assigned_to") === "me"
    ? guard.user.id
    : url.searchParams.get("assigned_to") ?? guard.user.id;
  const includeDone = url.searchParams.get("include_done") === "1";
  const now = nowIso();

  const rows = await many(
    db,
    `select ai.id, ai.subject_user_id, ai.assigned_to_user_id,
            ai.body, ai.snooze_until, ai.done_at, ai.created_at,
            u.email as subject_email, u.display_name as subject_name
       from crm_action_items ai
       left join users u on u.id = ai.subject_user_id
      where ai.assigned_to_user_id = ?
        ${includeDone ? "" : "and ai.done_at is null"}
        and (ai.snooze_until is null or ai.snooze_until <= ?)
      order by coalesce(ai.snooze_until, ai.created_at) asc`,
    [assignedTo, now],
  );
  return json({ actions: rows });
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB!;

  let body: {
    subject_user_id?: string;
    body?: string;
    snooze_until?: string | null;
    assigned_to_user_id?: string;
  };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const subject = (body.subject_user_id ?? "").trim();
  const text = (body.body ?? "").trim();
  if (!subject || !text) return json({ error: "subject_user_id + body required." }, 400);

  const id = uuid();
  const now = nowIso();
  await run(
    db,
    `insert into crm_action_items
       (id, subject_user_id, assigned_to_user_id, author_user_id, body,
        snooze_until, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      subject,
      body.assigned_to_user_id ?? guard.user.id,
      guard.user.id,
      text,
      body.snooze_until ?? null,
      now,
      now,
    ],
  );
  return json({ ok: true, id });
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB!;
  const id = new URL(ctx.request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing ?id." }, 400);

  let body: { body?: string; snooze_until?: string | null; done?: boolean };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const parts: string[] = [];
  const params: unknown[] = [];
  if (body.body !== undefined) {
    parts.push("body = ?");
    params.push(body.body.trim());
  }
  if (body.snooze_until !== undefined) {
    parts.push("snooze_until = ?");
    params.push(body.snooze_until);
  }
  if (body.done !== undefined) {
    parts.push("done_at = ?");
    params.push(body.done ? nowIso() : null);
  }
  if (parts.length === 0) return json({ error: "Nothing to update." }, 400);
  parts.push("updated_at = ?");
  params.push(nowIso());
  params.push(id);
  await run(
    db,
    `update crm_action_items set ${parts.join(", ")} where id = ?`,
    params,
  );
  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB!;
  const id = new URL(ctx.request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing ?id." }, 400);
  await run(db, `delete from crm_action_items where id = ?`, [id]);
  return json({ ok: true });
};
