import Stripe from "stripe";
import { envConfig } from "./env.config";

let stripeClient: Stripe | null = null;

if (envConfig.STRIPE_SECRET_KEY) {
  stripeClient = new Stripe(envConfig.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover"
  });
}

export const getStripeClient = (): Stripe => {
  if (!stripeClient) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.");
  }
  return stripeClient;
};

export const isStripeConfigured = (): boolean => {
  return !!envConfig.STRIPE_SECRET_KEY;
};

export default stripeClient;
