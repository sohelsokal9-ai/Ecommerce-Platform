import type { AdminOrderType } from "./order.type";
import type { ProductType } from "./products.type";

export type AdminAnalyticsType = {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalOutOfStock: number;
};

export type AdminAnalyticsResponse = {
  message: string;
} & AdminAnalyticsType;

export type AdminOrdersResponse = {
  message: string;
  orders: AdminOrderType[];
};

export type AdminProductsResponse = {
  message: string;
  products: ProductType[];
};

export type UpdateOrderStatusInput = {
  status: string;
  note?: string;
};

export type UpdateOrderStatusResponse = {
  message: string;
  order: AdminOrderType;
};
