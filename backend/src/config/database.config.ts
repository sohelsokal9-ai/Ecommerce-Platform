import { getSupabaseClient } from "./supabase.config";

export const connectDatabase = async () => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("users").select("id").limit(1);
    if (error && error.code === "42P01") {
      console.warn("WARNING: Tables not found. Run the SQL schema in Supabase Dashboard.");
      console.warn("Go to: Supabase Dashboard → SQL Editor → paste schema.sql → Run");
    } else {
      console.log("Database connected!");
    }
  } catch (error) {
    console.warn("Database connection warning:", error);
  }
};
