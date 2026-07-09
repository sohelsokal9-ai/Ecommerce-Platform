import getSupabaseClient from "../config/supabase.config";
import { mapRow } from "../utils/map.util";

export const findUserById = async (id: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, phone, avatar, created_at, updated_at")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapRow(data) as any;
};
