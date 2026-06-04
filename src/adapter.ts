// =============================================================================
// adapt — Pages Function → Worker handler shim
// =============================================================================
// Pages Functions take a single `context` object with .request, .env,
// .params, .waitUntil, etc. Worker handlers take (request, env, ctx)
// separately. This adapter wraps a PagesFunction so it's callable from
// the router with Worker-style args; the handler body inside is
// unchanged.
//
// The router computes `params` from URLPattern matches and passes them
// in alongside the request — keeping the file-based routing intuition
// the Pages Functions were written against, without actually relying
// on file-based routing.
// =============================================================================

export type AdaptedHandler<EnvT> = (
  req: Request,
  env: EnvT,
  ctx: ExecutionContext,
  params: Record<string, string>,
) => Promise<Response>;

export function adapt<EnvT>(
  // The handler signature uses PagesFunction's context shape — we
  // mirror it inline rather than importing the type so this file has
  // zero Pages-runtime dependencies.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: any) => Response | Promise<Response>,
): AdaptedHandler<EnvT> {
  return (req, env, ctx, params) =>
    Promise.resolve(
      handler({
        request: req,
        env,
        params,
        waitUntil: ctx.waitUntil.bind(ctx),
        passThroughOnException: ctx.passThroughOnException.bind(ctx),
        next: async () =>
          new Response("next() not supported in Workers Assets adapter", {
            status: 501,
          }),
        data: {},
        functionPath: new URL(req.url).pathname,
      }),
    );
}
