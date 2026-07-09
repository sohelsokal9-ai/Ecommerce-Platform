import getSupabaseClient from "../config/supabase.config";
import { CreateReviewInput } from "../validators/review.validator";
import {
  BadRequestException,
  NotFoundException,
} from "../utils/app-error";
import { ORDER_STATUS, PAYMENT_STATUS } from "../constants/enums";
import { mapRow, mapRows } from "../utils/map.util";

export const createReviewService = async (
  userId: string,
  data: CreateReviewInput
) => {
  const { orderId, orderItemId, rating, comment } = data;
  const supabase = getSupabaseClient();

  const { data: orderData } = await supabase
    .from("orders")
    .select("id, status, payment_status")
    .eq("id", orderId)
    .eq("user_id", userId)
    .single();

  const order = orderData ? mapRow(orderData) : null;

  if (!order) {
    throw new NotFoundException("Order not found");
  }

  if (
    order.status !== ORDER_STATUS.DELIVERED ||
    order.paymentStatus !== PAYMENT_STATUS.PAID
  ) {
    throw new BadRequestException(
      "Order must be delivered and paid to leave a review"
    );
  }

  const { data: orderItemData } = await supabase
    .from("order_items")
    .select("id, product_id, is_reviewed")
    .eq("id", orderItemId)
    .eq("order_id", orderId)
    .single();

  const orderItem = orderItemData ? mapRow(orderItemData) : null;

  if (!orderItem) {
    throw new NotFoundException("Order item not found in this order");
  }

  if (orderItem.isReviewed) {
    throw new BadRequestException("You have already reviewed this item");
  }

  const { data: existingReviewData } = await supabase
    .from("reviews")
    .select("id")
    .eq("order_item_id", orderItemId)
    .single();

  if (existingReviewData) {
    throw new BadRequestException("You have already reviewed this item");
  }

  const { data: review, error: reviewError } = await supabase
    .from("reviews")
    .insert({
      user_id: userId,
      order_id: orderId,
      order_item_id: orderItemId,
      product_id: orderItem.productId,
      rating,
      comment: comment || null,
    })
    .select()
    .single();

  if (reviewError) throw new BadRequestException(reviewError.message);

  await supabase
    .from("order_items")
    .update({ is_reviewed: true })
    .eq("id", orderItem._id);

  const { data: aggResult } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", orderItem.productId);

  const ratings = mapRows(aggResult || []).map((r: any) => r.rating);
  const newAverage = ratings.length > 0
    ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
    : 0;
  const newCount = ratings.length;

  await supabase
    .from("products")
    .update({
      rating_average: newAverage,
      review_count: newCount,
    })
    .eq("id", orderItem.productId);

  return { review: mapRow(review) };
};

export const getUserReviewsService = async (userId: string) => {
  const supabase = getSupabaseClient();

  const { data: reviews, error } = await supabase
    .from("reviews")
    .select("*, products(name, slug, images)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const mapped = (reviews || []).map((r: any) => ({
    ...mapRow(r),
    product: r.products ? mapRow(r.products) : null,
  }));

  return { reviews: mapped };
};

export const getUserReviewableOrderItemsService = async (
  userId: string
) => {
  const supabase = getSupabaseClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_no, created_at")
    .eq("user_id", userId)
    .eq("status", ORDER_STATUS.DELIVERED)
    .eq("payment_status", PAYMENT_STATUS.PAID)
    .order("created_at", { ascending: false });

  if (!orders || orders.length === 0) {
    return { orders: [] };
  }

  const filteredOrders = [];

  for (const order of orders) {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, product_id, name, image, sale_price, quantity, is_reviewed")
      .eq("order_id", order.id)
      .eq("is_reviewed", false);

    if (items && items.length > 0) {
      filteredOrders.push({
        ...mapRow(order),
        items: mapRows(items),
      });
    }
  }

  return { orders: filteredOrders };
};
