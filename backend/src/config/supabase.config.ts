import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { envConfig } from "./env.config";

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(envConfig.SUPABASE_URL!, envConfig.SUPABASE_ANON_KEY!);
  }
  return supabaseClient;
};

export default getSupabaseClient;
