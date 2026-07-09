import getSupabaseClient from "../config/supabase.config";
import { UpsertCartInput } from "../validators/cart.validator";
import { BadRequestException } from "../utils/app-error";
import { calculateCartTotals } from "../utils/cart.util";
import { FREE_DELIVERY_THRESHOLD } from "../constants/constant";
import { mapRow, mapRows } from "../utils/map.util";

const emptyCartResponse = {
  cart: { items: [] as unknown[] },
  subtotal: 0,
  deliveryFee: 0,
  tax: 0,
  orderTotal: 0,
  freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
};

export const upsertCartService = async (
  userId: string | null,
  guestCartId: string | null,
  data: UpsertCartInput,
) => {
  if (!userId && !guestCartId) {
    throw new BadRequestException("User ID or guest cart ID is required");
  }

  const supabase = getSupabaseClient();

  const validItems: { productId: string; quantity: number }[] = [];
  const seenIds = new Set<string>();

  for (const item of data.items) {
    if (!item.productId) continue;
    if (seenIds.has(item.productId)) continue;
    seenIds.add(item.productId);
    validItems.push({
      productId: item.productId,
      quantity: item.quantity,
    });
  }

  if (validItems.length === 0) {
    const cart = await getOrCreateCart(supabase, userId, guestCartId);
    await supabase.from("cart_items").delete().eq("cart_id", cart._id);
    return emptyCartResponse;
  }

  const productIds = validItems.map((i) => i.productId);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, images, sale_price, original_price, discount_percent, stock_count")
    .in("id", productIds)
    .eq("is_active", true);

  const productMap = new Map(mapRows(products || []).map((p: any) => [p._id, p]));

  const filteredItems: { productId: string; quantity: number }[] = [];
  for (const item of validItems) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    filteredItems.push({
      productId: item.productId,
      quantity: Math.min(item.quantity, product.stockCount),
    });
  }

  if (filteredItems.length === 0) {
    const cart = await getOrCreateCart(supabase, userId, guestCartId);
    await supabase.from("cart_items").delete().eq("cart_id", cart._id);
    return emptyCartResponse;
  }

  const cart = await getOrCreateCart(supabase, userId, guestCartId);

  if (userId) {
    await supabase
      .from("carts")
      .update({ guest_cart_id: null, updated_at: new Date().toISOString() })
      .eq("id", cart._id);
  }

  await supabase.from("cart_items").delete().eq("cart_id", cart._id);

  const cartItemsToInsert = filteredItems.map((item) => ({
    cart_id: cart._id,
    product_id: item.productId,
    quantity: item.quantity,
  }));

  await supabase.from("cart_items").insert(cartItemsToInsert);

  const populatedItems = filteredItems.map((item) => {
    const product = productMap.get(item.productId)!;
    return {
      productId: { salePrice: product.salePrice, ...product },
      quantity: item.quantity,
    };
  });

  const totals = calculateCartTotals(populatedItems);

  return {
    cart: {
      items: filteredItems.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          productId: product,
          quantity: item.quantity,
        };
      }),
    },
    ...totals,
  };
};

export const getCartService = async (
  userId: string | null,
  guestCartId: string | null,
) => {
  if (!userId && !guestCartId) {
    throw new BadRequestException("User ID or guest cart ID is required");
  }

  const supabase = getSupabaseClient();

  let cartQuery = supabase.from("carts").select("id").limit(1).maybeSingle();

  if (userId) {
    cartQuery = cartQuery.eq("user_id", userId);
  } else {
    cartQuery = cartQuery.eq("guest_cart_id", guestCartId);
  }

  const { data: cartData } = await cartQuery;

  if (!cartData) {
    return emptyCartResponse;
  }

  const cart = mapRow(cartData);

  const { data: cartItemsRaw } = await supabase
    .from("cart_items")
    .select("id, cart_id, product_id, quantity, products(id, name, slug, images, sale_price, original_price, discount_percent, stock_count)")
    .eq("cart_id", cart._id);

  if (!cartItemsRaw || cartItemsRaw.length === 0) {
    return emptyCartResponse;
  }

  const cartItems = mapRows(cartItemsRaw).map((item: any) => ({
    ...item,
    products: mapRow(item.products as any),
  }));

  const populatedItems = cartItems.map((item: any) => ({
    productId: {
      salePrice: (item.products as any)?.salePrice ?? 0,
      ...(item.products as any),
    },
    quantity: item.quantity,
  }));

  const totals = calculateCartTotals(populatedItems);

  return {
    cart: {
      items: cartItems.map((item: any) => ({
        productId: item.products,
        quantity: item.quantity,
      })),
    },
    ...totals,
  };
};

export const mergeGuestCartService = async (
  userId: string,
  guestCartId: string | null
) => {
  if (!guestCartId) return;

  const supabase = getSupabaseClient();

  const { data: guestCartData } = await supabase
    .from("carts")
    .select("id")
    .eq("guest_cart_id", guestCartId)
    .single();

  const guestCart = guestCartData ? mapRow(guestCartData) : null;

  if (!guestCart) return;

  const { data: guestCartItemsRaw } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("cart_id", guestCart._id);

  const guestCartItems = mapRows(guestCartItemsRaw || []);

  if (guestCartItems.length === 0) return;

  let { data: userCartData } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .single();

  let userCart = userCartData ? mapRow(userCartData) : null;

  if (!userCart) {
    const { data: newCart } = await supabase
      .from("carts")
      .update({ user_id: userId, guest_cart_id: null, updated_at: new Date().toISOString() })
      .eq("id", guestCart._id)
      .select("id")
      .single();
    userCart = newCart ? mapRow(newCart) : null;
  } else {
    const { data: existingUserCartItemsRaw } = await supabase
      .from("cart_items")
      .select("product_id, quantity")
      .eq("cart_id", userCart._id);

    const existingUserCartItems = mapRows(existingUserCartItemsRaw || []);

    const mergedItems = new Map<string, number>();

    for (const item of existingUserCartItems) {
      mergedItems.set(item.productId as string, item.quantity as number);
    }

    for (const item of guestCartItems) {
      const existing = mergedItems.get(item.productId as string);
      if (existing) {
        mergedItems.set(item.productId as string, existing + (item.quantity as number));
      } else {
        mergedItems.set(item.productId as string, item.quantity as number);
      }
    }

    const allProductIds = Array.from(mergedItems.keys());
    const { data: products } = await supabase
      .from("products")
      .select("id, stock_count")
      .in("id", allProductIds)
      .eq("is_active", true);

    const productMap = new Map(mapRows(products || []).map((p: any) => [p._id, p]));

    const validatedItems: { cart_id: string; product_id: string; quantity: number }[] = [];
    for (const [productId, quantity] of mergedItems.entries()) {
      const product = productMap.get(productId);
      if (!product) continue;
      validatedItems.push({
        cart_id: userCart!._id as string,
        product_id: productId,
        quantity: Math.min(quantity, product.stockCount),
      });
    }

    await supabase.from("cart_items").delete().eq("cart_id", userCart._id);
    if (validatedItems.length > 0) {
      await supabase.from("cart_items").insert(validatedItems);
    }
  }

  await supabase.from("cart_items").delete().eq("cart_id", guestCart._id);
  await supabase.from("carts").delete().eq("id", guestCart._id);
};

async function getOrCreateCart(supabase: any, userId: string | null, guestCartId: string | null) {
  let query = supabase.from("carts").select("id").limit(1).maybeSingle();

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("guest_cart_id", guestCartId);
  }

  const { data: existingData } = await query;
  if (existingData) return mapRow(existingData);

  const insertData: Record<string, unknown> = {};
  if (userId) insertData.user_id = userId;
  else insertData.guest_cart_id = guestCartId;

  const { data: created, error } = await supabase
    .from("carts")
    .insert(insertData)
    .select("id")
    .single();

  if (error) throw new BadRequestException("Failed to create cart");
  return mapRow(created);
}
