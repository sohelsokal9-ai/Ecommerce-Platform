import getSupabaseClient from "../config/supabase.config";
import { mapRows } from "../utils/map.util";

export const getCategoriesService = async () => {
  const supabase = getSupabaseClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("id", { ascending: true });

  if (error) throw new Error(error.message);

  return { categories: mapRows(categories || []) };
};
