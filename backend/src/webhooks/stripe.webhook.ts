import { Request, Response, NextFunction } from "express";
import { getStripeClient } from "../config/stripe.config";
import { envConfig } from "../config/env.config";
import getSupabaseClient from "../config/supabase.config";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
} from "../constants/enums";

export const stripeWebhookHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
  const sig = req.headers["stripe-signature"] as string;

  let event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      req.body,
      sig,
      envConfig.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    res.status(400).json({ message: "Webhook signature verification failed" });
    return;
  }

  const session = event.data.object as {
    metadata?: { orderId?: string };
  };
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    res.status(200).json({ received: true });
    return;
  }

  const supabase = getSupabaseClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) {
    res.status(200).json({ received: true });
    return;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const history = (order.status_history as any[]) || [];
      history.push({ status: ORDER_STATUS.CONFIRMED, note: "", date: new Date().toISOString() });

      await supabase
        .from("orders")
        .update({
          payment_status: PAYMENT_STATUS.PAID,
          status: ORDER_STATUS.CONFIRMED,
          status_history: history,
        })
        .eq("id", orderId);

      await supabase.from("carts").delete().eq("user_id", order.user_id);

      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      for (const item of items || []) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_count")
          .eq("id", item.product_id)
          .single();
        if (product) {
          await supabase
            .from("products")
            .update({ stock_count: Math.max(0, product.stock_count - item.quantity) })
            .eq("id", item.product_id);
        }
      }

      console.log(`Order ${order.order_no} paid and confirmed`);
      break;
    }

    case "checkout.session.expired": {
      const history = (order.status_history as any[]) || [];
      history.push({ status: ORDER_STATUS.CANCELLED, note: "", date: new Date().toISOString() });

      await supabase
        .from("orders")
        .update({
          payment_status: PAYMENT_STATUS.FAILED,
          status: ORDER_STATUS.CANCELLED,
          status_history: history,
        })
        .eq("id", orderId);

      console.log(`Order ${order.order_no} payment expired`);
      break;
    }
  }

  res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};
