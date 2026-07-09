import {
  ORDER_STATUS,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PAYMENT_STATUS,
} from "../constants/enums";
import { generateOrderNo } from "../utils/order.util";

export interface IOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string;
  image: string;
  original_price: number;
  discount_percent: number;
  sale_price: number;
  quantity: number;
  is_reviewed: boolean;
}

export interface IOrderAddress {
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrderStatusHistory {
  status: OrderStatus;
  note: string;
  date: string;
}

export interface IOrder {
  id: string;
  user_id: string;
  order_no: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  shipping_address: IOrderAddress;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  status_history: IOrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

export interface IOrderWithItems extends IOrder {
  order_items: IOrderItem[];
}

export const generateOrderNoValue = (): string => {
  return generateOrderNo();
};
