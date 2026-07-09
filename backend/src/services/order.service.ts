import getSupabaseClient from "../config/supabase.config";
import { CreateOrderInput } from "../validators/order.validator";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { calculateCartTotals } from "../utils/cart.util";
import { PAYMENT_METHODS, PaymentMethod } from "../constants/enums";
import { getStripeClient, isStripeConfigured } from "../config/stripe.config";
import { envConfig } from "../config/env.config";
import { generateOrderNoValue } from "../models/order.model";
import { mapRow, mapRows } from "../utils/map.util";

export const createOrderService = async (
  userId: string,
  data: CreateOrderInput
) => {
  const { addressId, paymentMethod } = data;
  const supabase = getSupabaseClient();

  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (!cart) {
    throw new BadRequestException("Cart is empty");
  }

  const mappedCart = mapRow(cart as Record<string, unknown>);

  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("id, product_id, quantity, products(id, name, images, original_price, discount_percent, sale_price, stock_count)")
    .eq("cart_id", mappedCart._id);

  if (!cartItems || cartItems.length === 0) {
    throw new BadRequestException("Cart is empty");
  }

  const mappedCartItems = mapRows(cartItems as Record<string, unknown>[]);

  const { data: address } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", addressId)
    .eq("user_id", userId)
    .single();

  if (!address) {
    throw new NotFoundException("Address not found");
  }

  const mappedAddress = mapRow(address as Record<string, unknown>);

  const items = mappedCartItems.map((item: any) => ({
    productId: item.productId,
    product: item.products,
    quantity: item.quantity,
  }));

  const cartTotalsItems = items.map((item) => ({
    productId: { salePrice: item.product?.sale_price ?? 0 },
    quantity: item.quantity,
  }));

  const totals = calculateCartTotals(cartTotalsItems);

  const orderItems = items.map((item) => ({
    product_id: item.productId,
    name: item.product?.name || "",
    image: item.product?.images?.[0] || "",
    original_price: item.product?.original_price || 0,
    discount_percent: item.product?.discount_percent || 0,
    sale_price: item.product?.sale_price || 0,
    quantity: item.quantity,
    is_reviewed: false,
  }));

  const shippingAddress = {
    recipientName: mappedAddress.recipientName,
    phone: mappedAddress.phone,
    street: mappedAddress.street,
    city: mappedAddress.city,
    state: mappedAddress.state,
    postalCode: mappedAddress.postalCode,
    country: mappedAddress.country,
  };

  const orderNo = generateOrderNoValue();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      order_no: orderNo,
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      subtotal: totals.subtotal,
      delivery_fee: totals.deliveryFee,
      tax: totals.tax,
      total: totals.orderTotal,
      status_history: [{ status: "placed", note: "", date: new Date().toISOString() }],
    })
    .select()
    .single();

  if (orderError || !order) {
    throw new BadRequestException(orderError?.message || "Failed to create order");
  }

  const mappedOrder = mapRow(order as Record<string, unknown>);

  const orderItemsToInsert = orderItems.map((item) => ({
    order_id: mappedOrder._id,
    ...item,
  }));

  await supabase.from("order_items").insert(orderItemsToInsert);

  if (paymentMethod === PAYMENT_METHODS.CASH_ON_DELIVERY) {
    await supabase.from("cart_items").delete().eq("cart_id", mappedCart._id);
    await supabase.from("carts").delete().eq("id", mappedCart._id);

    for (const item of items) {
      await supabase.rpc("decrement_stock", {
        p_product_id: item.productId,
        p_quantity: item.quantity,
      }).then(() => {}).catch(async () => {
        const { data: product } = await supabase
          .from("products")
          .select("stock_count")
          .eq("id", item.productId)
          .single();
        if (product) {
          const mappedProduct = mapRow(product as Record<string, unknown>);
          await supabase
            .from("products")
            .update({ stock_count: Math.max(0, (mappedProduct.stockCount as number) - item.quantity) })
            .eq("id", item.productId);
        }
      });
    }

    return { order: mappedOrder, stripeUrl: null };
  }

  if (!isStripeConfigured()) {
    throw new BadRequestException("Online payment is not available. Please use Cash on Delivery.");
  }

  const lineItems = orderItems.map((item) => ({
    price_data: {
      currency: "usd",
      product_data: {
        name: item.name,
        images: item.image ? [item.image] : [],
      },
      unit_amount: Math.round(item.sale_price * 100),
    },
    quantity: item.quantity,
  }));

  if (totals.deliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Delivery Fee" },
        unit_amount: Math.round(totals.deliveryFee * 100),
      },
      quantity: 1,
    });
  }

  if (totals.tax > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Tax" },
        unit_amount: Math.round(totals.tax * 100),
      },
      quantity: 1,
    });
  }

  const { data: user } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  const session = await getStripeClient().checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    customer_email: user?.email,
    line_items: lineItems,
    metadata: { orderId: mappedOrder._id as string },
    success_url: `${envConfig.FRONTEND_ORIGIN}/orders/${mappedOrder._id}`,
    cancel_url: `${envConfig.FRONTEND_ORIGIN}/checkout`,
  });

  return { stripeUrl: session.url! };
};

export const getUserOrdersService = async (userId: string) => {
  const supabase = getSupabaseClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const mappedOrders = mapRows((orders || []) as Record<string, unknown>[]);

  const ordersWithItems = await Promise.all(
    mappedOrders.map(async (order) => {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", (order as any)._id);
      const mappedItems = mapRows((items || []) as Record<string, unknown>[]);
      return { ...order, order_items: mappedItems };
    })
  );

  return { orders: ordersWithItems };
};

export const getUserOrderByIdService = async (
  userId: string,
  orderId: string
) => {
  const supabase = getSupabaseClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .single();

  if (error || !order) {
    throw new NotFoundException("Order not found");
  }

  const mappedOrder = mapRow(order as Record<string, unknown>);

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", (mappedOrder as any)._id);

  const mappedItems = mapRows((items || []) as Record<string, unknown>[]);

  return { order: { ...mappedOrder, order_items: mappedItems } };
};
