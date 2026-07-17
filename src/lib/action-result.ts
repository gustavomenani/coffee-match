/** Shared result contract for Server Actions. */
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Variant for create/update actions that return the affected id. */
export type ActionResultWithId =
  | { ok: true; id?: string }
  | { ok: false; error: string };
