import { supabase } from "@/shared/api/supabase";

export type UserRole = "manager" | "executor";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export async function getProfile(): Promise<Profile> {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("User is not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (error) {
    throw error;
  }

  return data as Profile;
}
