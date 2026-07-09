export const mapRow = <T extends Record<string, unknown>>(row: T): Record<string, unknown> => {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === "id") {
      mapped["_id"] = value;
    } else if (key === "created_at") {
      mapped["createdAt"] = value;
    } else if (key === "updated_at") {
      mapped["updatedAt"] = value;
    } else if (key === "user_id") {
      mapped["userId"] = value;
    } else if (key === "category_id") {
      mapped["categoryId"] = value;
    } else if (key === "guest_cart_id") {
      mapped["guestCartId"] = value;
    } else if (key === "order_no") {
      mapped["orderNo"] = value;
    } else if (key === "payment_method") {
      mapped["paymentMethod"] = value;
    } else if (key === "payment_status") {
      mapped["paymentStatus"] = value;
    } else if (key === "shipping_address") {
      mapped["shippingAddress"] = value;
    } else if (key === "delivery_fee") {
      mapped["deliveryFee"] = value;
    } else if (key === "status_history") {
      mapped["statusHistory"] = value;
    } else if (key === "original_price") {
      mapped["originalPrice"] = value;
    } else if (key === "sale_price") {
      mapped["salePrice"] = value;
    } else if (key === "discount_percent") {
      mapped["discountPercent"] = value;
    } else if (key === "discount_label") {
      mapped["discountLabel"] = value;
    } else if (key === "stock_count") {
      mapped["stockCount"] = value;
    } else if (key === "rating_average") {
      mapped["ratingAverage"] = value;
    } else if (key === "review_count") {
      mapped["reviewCount"] = value;
    } else if (key === "is_active") {
      mapped["isActive"] = value;
    } else if (key === "image_url") {
      mapped["imageUrl"] = value;
    } else if (key === "recipient_name") {
      mapped["recipientName"] = value;
    } else if (key === "postal_code") {
      mapped["postalCode"] = value;
    } else if (key === "is_default") {
      mapped["isDefault"] = value;
    } else if (key === "cart_id") {
      mapped["cartId"] = value;
    } else if (key === "product_id") {
      mapped["productId"] = value;
    } else if (key === "order_id") {
      mapped["orderId"] = value;
    } else if (key === "order_item_id") {
      mapped["orderItemId"] = value;
    } else if (key === "is_reviewed") {
      mapped["isReviewed"] = value;
    } else {
      mapped[key] = value;
    }
  }
  return mapped;
};

export const mapRows = <T extends Record<string, unknown>>(rows: T[]): Record<string, unknown>[] => {
  return rows.map(mapRow);
};
