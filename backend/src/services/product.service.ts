import ProductModel from "../models/product.model";
import ReviewModel from "../models/review.model";
import CategoryModel from "../models/category.model";
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
import mongoose, { Types } from "mongoose";

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

  const filter: Record<string, unknown> = { isActive:true };

  if (categoryId && mongoose.isValidObjectId(categoryId)) {
    filter.categoryId = new Types.ObjectId(categoryId);
  }

  if (hasDiscount !== undefined) {
    filter.discountPercent = hasDiscount ? { $gt: 0 } : { $lte: 0 };
  }

  if (inStock !== undefined) {
    filter.stockCount = inStock ? { $gt: 0 } : { $lte: 0 };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.salePrice = {};
    if (minPrice !== undefined) {
      (filter.salePrice as Record<string, number>).$gte = minPrice;
    }
    if (maxPrice !== undefined) {
      (filter.salePrice as Record<string, number>).$lte = maxPrice;
    }
  }

  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }

  type SortOption = "best-match" | "price-low" | "price-high" | "highest-rating";

  const sortMap: Record<SortOption, Record<string, 1 | -1>> = {
  "best-match": { createdAt: -1 },
  "price-low": { salePrice: 1 },
  "price-high": { salePrice: -1 },
  "highest-rating": { ratingAverage: -1 },
};

  const effectiveSkip = skip ?? (page - 1) * limit;

  const [products, total] = await Promise.all([
    ProductModel.find(filter)
      .sort(sortMap[sort])
      .skip(effectiveSkip)
      .limit(limit)
      .populate("categoryId", "name slug")
      .select("name slug images unit originalPrice salePrice discountPercent discountLabel stockCount ratingAverage reviewCount categoryId")
      .lean(),
    ProductModel.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(total / limit)

  return {
    products,
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
  const products = await ProductModel.find({
    isActive: true,
    discountPercent: { $gt: 0 },
    stockCount: { $gt: 0 }
  })
    .sort({ discountPercent: -1 })
    .limit(limit)
    .select("name slug images originalPrice salePrice discountPercent discountLabel unit ratingAverage reviewCount")
    .lean();

  return { products };
};

export const getProductBySlugService = async ({
  slug,
}: GetProductBySlugInput) => {
  const product = await ProductModel.findOne({ slug, isActive: true })
    .populate("categoryId", "name slug")
    .select("name slug images description originalPrice salePrice unit discountPercent discountLabel stockCount ratingAverage reviewCount categoryId createdAt")
    .lean();

  if (!product) throw new NotFoundException("Product not found");

  const relatedProducts = await ProductModel.find({
    categoryId: product.categoryId,
    isActive: true,
    slug: { $ne: slug },
  })
    .sort({ createdAt: -1 })
    .limit(6)
    .select("name slug images originalPrice salePrice discountPercent discountLabel ratingAverage reviewCount")
    .lean();

  return { product, relatedProducts };
};

export const getProductReviewsService = async ({
  slug,
  page,
  limit,
}: GetProductReviewsInput) => {
  const product = await ProductModel.findOne({ slug, isActive: true })
    .select("_id")
    .lean();

  if (!product) throw new NotFoundException("Product not found");

  const productId = product._id;
  const skip = (page - 1) * limit;

  const [reviews, total, ratingAgg] = await Promise.all([
    ReviewModel.find({ productId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
          path: "userId",
          select: "name avatar",
        })
      .lean(),
    ReviewModel.countDocuments({ productId }),
    ReviewModel.aggregate([
      { $match: { productId } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),
  ]);

  const breakdownMap: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const { _id, count } of ratingAgg) {
    breakdownMap[_id as number] = count;
  }

  const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: breakdownMap[rating],
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

  if (!mongoose.isValidObjectId(categoryId)) {
    throw new BadRequestException("Invalid category ID");
  }

  const category = await CategoryModel.findById(categoryId).lean();
  if (!category) {
    throw new BadRequestException("Category not found");
  }

  const product = await ProductModel.create({
    ...data,
    userId,
    categoryId: new Types.ObjectId(categoryId),
  });

  return product;
};

export const getProductsForAdminService = async (
  query: GetProductsForAdminInput
) => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    ProductModel.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("categoryId", "name slug")
      .lean(),
    ProductModel.countDocuments(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    products,
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
  if (!mongoose.isValidObjectId(productId)) {
    throw new BadRequestException("Invalid product ID");
  }

  const product = await ProductModel.findById(productId);
  if (!product) throw new NotFoundException("Product not found");

  if (data.categoryId) {
    if (!mongoose.isValidObjectId(data.categoryId)) {
      throw new BadRequestException("Invalid category ID");
    }
    const category = await CategoryModel.findById(data.categoryId).lean();
    if (!category) throw new BadRequestException("Category not found");
    product.categoryId = new Types.ObjectId(data.categoryId);
  }

  if (data.name !== undefined) product.name = data.name;
  if (data.description !== undefined) product.description = data.description;
  if (data.images !== undefined) product.images = data.images;
  if (data.originalPrice !== undefined) product.originalPrice = data.originalPrice;
  if (data.discountPercent !== undefined) product.discountPercent = data.discountPercent;
  if (data.discountLabel !== undefined) product.discountLabel = data.discountLabel;
  if (data.unit !== undefined) product.unit = data.unit;
  if (data.stockCount !== undefined) product.stockCount = data.stockCount;
  if (data.isActive !== undefined) product.isActive = data.isActive;

  await product.save();
  return product;
};

export const deleteProductService = async (productId: string) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new BadRequestException("Invalid product ID");
  }

  const product = await ProductModel.findByIdAndDelete(productId);
  if (!product) throw new NotFoundException("Product not found");

  return { message: "Product deleted successfully" };
};
