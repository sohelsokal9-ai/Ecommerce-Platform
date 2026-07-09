import getSupabaseClient from "../config/supabase.config";
import { ORDER_STATUS, PAYMENT_STATUS } from "../constants/enums";
import {
  GetAdminOrdersInput,
  UpdateOrderStatusBodyInput,
  UpdateOrderStatusParamsInput,
} from "../validators/admin.validator";
import { NotFoundException } from "../utils/app-error";
import { mapRow, mapRows } from "../utils/map.util";

export const getAdminAnalyticsService = async () => {
  const supabase = getSupabaseClient();

  const [ordersCount, usersCount, productsCount, outOfStockResult, salesResult] =
    await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).lte("stock_count", 0),
      supabase.from("orders").select("total").eq("payment_status", PAYMENT_STATUS.PAID),
    ]);

  const totalSales = mapRows(salesResult.data || []).reduce(
    (sum: number, order: any) => sum + (Number(order.total) || 0),
    0
  );

  return {
    totalSales,
    totalOrders: ordersCount.count || 0,
    totalUsers: usersCount.count || 0,
    totalProducts: productsCount.count || 0,
    totalOutOfStock: outOfStockResult.count || 0,
  };
};

export const getAdminOrdersService = async ({
  page,
  limit,
}: GetAdminOrdersInput) => {
  const skip = (page - 1) * limit;
  const supabase = getSupabaseClient();

  const [ordersResult, countResult] = await Promise.all([
    supabase
      .from("orders")
      .select("*, users(name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1),
    supabase.from("orders").select("id", { count: "exact", head: true }),
  ]);

  const total = countResult.count || 0;
  const totalPages = Math.ceil(total / limit);

  const ordersWithItems = await Promise.all(
    mapRows(ordersResult.data || []).map(async (order: any) => {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order._id);
      return {
        ...order,
        user: order.users ? mapRow(order.users) : null,
        order_items: mapRows(items || []),
      };
    })
  );

  return {
    orders: ordersWithItems,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

export const updateOrderStatusService = async (
  params: UpdateOrderStatusParamsInput,
  body: UpdateOrderStatusBodyInput
) => {
  const supabase = getSupabaseClient();

  const { data: orderData } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!orderData) throw new NotFoundException("Order not found");

  const order = mapRow(orderData);

  const history = (order.statusHistory as any[]) || [];
  const statusExists = history.some((entry: any) => entry.status === body.status);

  const newHistory = [...history];
  if (!statusExists) {
    newHistory.push({
      status: body.status,
      note: body.note || `Status updated to ${body.status} by admin`,
      date: new Date().toISOString(),
    });
  }

  const updateData: Record<string, unknown> = {
    status: body.status,
    status_history: newHistory,
    updated_at: new Date().toISOString(),
  };

  if (
    body.status === ORDER_STATUS.DELIVERED &&
    order.paymentMethod === "cash_on_delivery" &&
    order.paymentStatus !== PAYMENT_STATUS.PAID
  ) {
    updateData.payment_status = PAYMENT_STATUS.PAID;
  }

  const { data: updatedOrderData, error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const updatedOrder = mapRow(updatedOrderData);

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", updatedOrder._id);

  return { order: { ...updatedOrder, order_items: mapRows(items || []) } };
};
