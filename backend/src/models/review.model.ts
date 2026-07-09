export interface IReview {
  id: string;
  user_id: string;
  order_id: string;
  order_item_id: string;
  product_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  updated_at: string;
}

export interface IReviewWithUser extends IReview {
  users?: { name: string; avatar: string | null } | null;
}

export interface IReviewWithProduct extends IReview {
  products?: { name: string; slug: string; images: string[] } | null;
}
