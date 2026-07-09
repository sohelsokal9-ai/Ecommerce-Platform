import { getEnv, getEnvOptional } from "../utils/get-env.util";

export const envConfig = {
  NODE_ENV: getEnv("NODE_ENV"),
  PORT: getEnv("PORT"),

  JWT_SECRET: getEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN"),

  SUPABASE_URL: getEnv("SUPABASE_URL"),
  SUPABASE_ANON_KEY: getEnv("SUPABASE_ANON_KEY"),

  STRIPE_SECRET_KEY: getEnvOptional("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: getEnvOptional("STRIPE_WEBHOOK_SECRET"),

  FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN"),
};
