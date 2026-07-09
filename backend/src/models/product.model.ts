import slugify from "slugify";
import { calculateSalePrice } from "../utils/price.util";

export interface IProduct {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string | null;
  images: string[];
  original_price: number;
  sale_price: number;
  discount_percent: number;
  discount_label?: string | null;
  unit: string;
  stock_count: number;
  rating_average: number;
  review_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IProductWithCategory extends IProduct {
  categories?: { name: string; slug: string } | null;
}

export const generateProductSlug = (name: string): string => {
  return slugify(name, { lower: true, strict: true });
};

export const computeSalePrice = (originalPrice: number, discountPercent: number): number => {
  if (discountPercent > 0) {
    return calculateSalePrice(originalPrice, discountPercent);
  }
  return originalPrice;
};
