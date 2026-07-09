import { Router } from "express";
import { stripeWebhookHandler } from "../webhooks/stripe.webhook";
import express from "express";
import { isStripeConfigured } from "../config/stripe.config";

const webhookRouter = Router();

if (isStripeConfigured()) {
  webhookRouter.post(
    "/stripe",
    express.raw({ type: "application/json" }),
    stripeWebhookHandler
  );
}

export default webhookRouter;
