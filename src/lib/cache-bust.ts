import { revalidatePath } from "next/cache";

/** Invalidate the public event surfaces after sales or admin edits. */
export function bustEventCaches(slug?: string) {
  revalidatePath("/eventos");
  revalidatePath("/");
  if (slug) revalidatePath(`/eventos/${slug}`);
}
