export interface ICart {
  id: string;
  user_id: string | null;
  guest_cart_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ICartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
}

export interface ICartItemWithProduct extends ICartItem {
  products: {
    name: string;
    slug: string;
    images: string[];
    sale_price: number;
    original_price: number;
    discount_percent: number;
    stock_count: number;
  } | null;
}
