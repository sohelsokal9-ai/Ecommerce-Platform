import { getSupabaseClient } from "./supabase.config";

export const connectDatabase = async () => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error) throw error;
    console.log("Database connected!");
  } catch (error) {
    console.log("Database connection error", error);
    process.exit(1);
  }
};
