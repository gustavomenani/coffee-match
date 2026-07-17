"use server";

import { updateProfile } from "@/lib/actions/profile";

export type ProfileFormState =
  | { error: string; success?: undefined }
  | { success: true; error?: undefined }
  | null;

export async function updateProfileWithState(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const result = await updateProfile(formData);
  if (!result.ok) {
    return { error: result.error };
  }
  return { success: true };
}
