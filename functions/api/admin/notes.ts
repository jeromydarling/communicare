// =============================================================================
// POST /api/admin/notes — add a note to a contact
// PUT  /api/admin/notes?id=… — edit / toggle pin
// DELETE /api/admin/notes?id=…
// =============================================================================
// Markdown-flavored plain text (rendered by the client). Author is the
// signed-in admin. Notes are internal; never seen by the contact.
// =============================================================================

import { preflight, json } from "../../_lib/cors";
import { requireAdmin } from "../../_lib/admin";
import { one, run, uuid, nowIso } from "../../_lib/db";

type Env = { DB?: D1Database; SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string };

export const onRequestOptions: PagesFunction = () => preflight();

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB!;

  let body: { subject_user_id?: string; body?: string; pinned?: boolean };
  try {
    body = await ctx.request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const subjectId = (body.subject_user_id ?? "").trim();
  const noteBody = (body.body ?? "").trim();
  if (!subjectId) return json({ error: "subject_user_id required." }, 400);
  if (!noteBody) return json({ error: "body required." }, 400);

  const exists = await one<{ id: string }>(
    db,
    `select id from users where id = ?`,
    [subjectId],
  );
  if (!exists) return json({ error: "Subject not found." }, 404);

  const id = uuid();
  const now = nowIso();
  await run(
    db,
    `insert into crm_notes
       (id, subject_user_id, author_user_id, body, pinned, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [id, subjectId, guard.user.id, noteBody, body.pinned ? 1 : 0, now, now],
  );
  return json({ ok: true, id });
};

export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const guard = await requireAdmin(ctx.request, ctx.env);
  if (!guard.ok) return guard.response;
  const db = ctx.env.DB!;

  const id = new URL(ctx.request.url).searchParams.get("id");
  if (!id) return json({ error: "Missing ?id." }, 400);

  let body: { body?: string; pinned?: boolean };
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
  if (body.pinned !== undefined) {
    parts.push("pinned = ?");
    params.push(body.pinned ? 1 : 0);
  }
  if (parts.length === 0) return json({ error: "Nothing to update." }, 400);
  parts.push("updated_at = ?");
  params.push(nowIso());
  params.push(id);
  await run(
    db,
    `update crm_notes set ${parts.join(", ")} where id = ?`,
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
  await run(db, `delete from crm_notes where id = ?`, [id]);
  return json({ ok: true });
};
