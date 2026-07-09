import getSupabaseClient from "../config/supabase.config";
import {
  GetProductsInput,
  GetDealsInput,
  GetProductBySlugInput,
  GetProductReviewsInput,
  CreateProductInput,
  GetProductsForAdminInput,
  UpdateProductInput,
} from "../validators/product.validator";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { generateProductSlug, computeSalePrice } from "../models/product.model";
import { mapRow, mapRows } from "../utils/map.util";

export const getProductsService = async (query: GetProductsInput) => {
  const {
    categoryId,
    page,
    limit,
    hasDiscount,
    inStock,
    minPrice,
    maxPrice,
    sort,
    keyword,
    skip,
  } = query;

  const supabase = getSupabaseClient();
  const effectiveSkip = skip ?? (page - 1) * limit;

  let queryBuilder = supabase
    .from("products")
    .select("id, name, slug, images, unit, original_price, sale_price, discount_percent, discount_label, stock_count, rating_average, review_count, category_id, categories(name, slug)", { count: "exact" })
    .eq("is_active", true);

  if (categoryId) {
    queryBuilder = queryBuilder.eq("category_id", categoryId);
  }

  if (hasDiscount !== undefined) {
    queryBuilder = hasDiscount
      ? queryBuilder.gt("discount_percent", 0)
      : queryBuilder.lte("discount_percent", 0);
  }

  if (inStock !== undefined) {
    queryBuilder = inStock
      ? queryBuilder.gt("stock_count", 0)
      : queryBuilder.lte("stock_count", 0);
  }

  if (minPrice !== undefined) {
    queryBuilder = queryBuilder.gte("sale_price", minPrice);
  }

  if (maxPrice !== undefined) {
    queryBuilder = queryBuilder.lte("sale_price", maxPrice);
  }

  if (keyword) {
    queryBuilder = queryBuilder.or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`);
  }

  type SortOption = "best-match" | "price-low" | "price-high" | "highest-rating";
  const sortMap: Record<SortOption, { column: string; ascending: boolean }> = {
    "best-match": { column: "created_at", ascending: false },
    "price-low": { column: "sale_price", ascending: true },
    "price-high": { column: "sale_price", ascending: false },
    "highest-rating": { column: "rating_average", ascending: false },
  };

  const sortConfig = sortMap[sort];
  queryBuilder = queryBuilder.order(sortConfig.column, { ascending: sortConfig.ascending });
  queryBuilder = queryBuilder.range(effectiveSkip, effectiveSkip + limit - 1);

  const { data: products, count, error } = await queryBuilder;

  if (error) throw new BadRequestException(error.message);

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  const mappedProducts = mapRows(products || []).map((p) => ({
    ...p,
    category: p.categories,
  }));

  return {
    products: mappedProducts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: effectiveSkip + limit < total,
      hasPrevPage: page > 1,
    },
  };
};

export const getDealsService = async (query: GetDealsInput) => {
  const { limit } = query;
  const supabase = getSupabaseClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, slug, images, original_price, sale_price, discount_percent, discount_label, unit, rating_average, review_count")
    .eq("is_active", true)
    .gt("discount_percent", 0)
    .gt("stock_count", 0)
    .order("discount_percent", { ascending: false })
    .limit(limit);

  if (error) throw new BadRequestException(error.message);

  const mapped = mapRows(products || []);

  return { products: mapped };
};

export const getProductBySlugService = async ({
  slug,
}: GetProductBySlugInput) => {
  const supabase = getSupabaseClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("id, name, slug, images, description, original_price, sale_price, unit, discount_percent, discount_label, stock_count, rating_average, review_count, category_id, created_at, categories(name, slug)")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (error || !product) throw new NotFoundException("Product not found");

  const { data: relatedProducts } = await supabase
    .from("products")
    .select("id, name, slug, images, original_price, sale_price, discount_percent, discount_label, rating_average, review_count")
    .eq("category_id", product.category_id)
    .eq("is_active", true)
    .neq("slug", slug)
    .order("created_at", { ascending: false })
    .limit(6);

  const mappedProduct = {
    ...mapRow(product),
    category: product.categories,
  };

  const mappedRelated = mapRows(relatedProducts || []);

  return { product: mappedProduct, relatedProducts: mappedRelated };
};

export const getProductReviewsService = async ({
  slug,
  page,
  limit,
}: GetProductReviewsInput) => {
  const supabase = getSupabaseClient();

  const { data: product } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();

  if (!product) throw new NotFoundException("Product not found");

  const productId = product.id;
  const skip = (page - 1) * limit;

  const [reviewsResult, countResult, ratingResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, user_id, order_id, order_item_id, product_id, rating, comment, created_at, updated_at, users(name, avatar)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId),
    supabase
      .from("reviews")
      .select("rating")
      .eq("product_id", productId),
  ]);

  const reviews = mapRows(reviewsResult.data || []).map((r) => ({
    ...r,
    user: r.users,
  }));

  const total = countResult.count || 0;

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of ratingResult.data || []) {
    const rating = Math.round(r.rating);
    ratingCounts[rating] = (ratingCounts[rating] || 0) + 1;
  }

  const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratingCounts[rating],
  }));

  const totalPages = Math.ceil(total / limit);

  return {
    reviews,
    ratingBreakdown,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1,
    },
  };
};

export const createProductService = async (
  userId: string,
  data: CreateProductInput
) => {
  const { categoryId } = data;
  const supabase = getSupabaseClient();

  const { data: category } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .single();

  if (!category) {
    throw new BadRequestException("Category not found");
  }

  const slug = generateProductSlug(data.name);
  const salePrice = computeSalePrice(data.originalPrice, data.discountPercent || 0);

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      user_id: userId,
      category_id: categoryId,
      name: data.name,
      slug,
      description: data.description || null,
      images: data.images || [],
      original_price: data.originalPrice,
      sale_price: salePrice,
      discount_percent: data.discountPercent || 0,
      discount_label: data.discountLabel || null,
      unit: data.unit || "pc",
      stock_count: data.stockCount || 0,
    })
    .select()
    .single();

  if (error) throw new BadRequestException(error.message);
  return mapRow(product);
};

export const getProductsForAdminService = async (
  query: GetProductsForAdminInput
) => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;
  const supabase = getSupabaseClient();

  const [productsResult, countResult] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories(name, slug)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true }),
  ]);

  const total = countResult.count || 0;
  const totalPages = Math.ceil(total / limit);

  const mapped = mapRows(productsResult.data || []).map((p) => ({
    ...p,
    category: p.categories,
  }));

  return {
    products: mapped,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: skip + limit < total,
      hasPrevPage: page > 1,
    },
  };
};

export const updateProductService = async (
  productId: string,
  data: UpdateProductInput
) => {
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .single();

  if (!existing) throw new NotFoundException("Product not found");

  if (data.categoryId) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("id", data.categoryId)
      .single();
    if (!category) throw new BadRequestException("Category not found");
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (data.name !== undefined) {
    updateData.name = data.name;
    updateData.slug = generateProductSlug(data.name);
  }
  if (data.description !== undefined) updateData.description = data.description;
  if (data.images !== undefined) updateData.images = data.images;
  if (data.originalPrice !== undefined) updateData.original_price = data.originalPrice;
  if (data.discountPercent !== undefined) updateData.discount_percent = data.discountPercent;
  if (data.discountLabel !== undefined) updateData.discount_label = data.discountLabel;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.stockCount !== undefined) updateData.stock_count = data.stockCount;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.categoryId !== undefined) updateData.category_id = data.categoryId;

  if (data.originalPrice !== undefined || data.discountPercent !== undefined) {
    const origPrice = (data.originalPrice as number) ?? (updateData.original_price as number) ?? 0;
    const discPercent = (data.discountPercent as number) ?? (updateData.discount_percent as number) ?? 0;
    updateData.sale_price = computeSalePrice(origPrice, discPercent);
  }

  const { data: product, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", productId)
    .select()
    .single();

  if (error) throw new BadRequestException(error.message);
  return mapRow(product);
};

export const deleteProductService = async (productId: string) => {
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .single();

  if (!existing) throw new NotFoundException("Product not found");

  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw new BadRequestException(error.message);

  return { message: "Product deleted successfully" };
};
