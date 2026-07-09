-- Supabase schema for Kenakini E-commerce Platform
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
create table users (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  password text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  phone text,
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- CATEGORIES
-- ============================================
create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  image_url text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- PRODUCTS
-- ============================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  name text not null,
  slug text not null unique,
  description text,
  images text[] default '{}',
  original_price numeric not null check (original_price >= 0),
  sale_price numeric not null default 0,
  discount_percent numeric not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  discount_label text,
  unit text not null default 'pc',
  stock_count numeric not null default 0 check (stock_count >= 0),
  rating_average numeric not null default 0 check (rating_average >= 0 and rating_average <= 5),
  review_count numeric not null default 0 check (review_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_category_active on products(category_id, is_active);
create index idx_products_active_discount on products(is_active, discount_percent);
create index idx_products_active_sale on products(is_active, sale_price);

-- ============================================
-- ADDRESSES
-- ============================================
create table addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  street text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_addresses_user on addresses(user_id);

-- ============================================
-- CARTS
-- ============================================
create table carts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  guest_cart_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_carts_user on carts(user_id);
create index idx_carts_guest on carts(guest_cart_id);

-- ============================================
-- CART ITEMS
-- ============================================
create table cart_items (
  id uuid primary key default uuid_generate_v4(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity numeric not null default 1 check (quantity >= 1),
  unique(cart_id, product_id)
);

-- ============================================
-- ORDERS
-- ============================================
create table orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  order_no text not null unique,
  payment_method text not null check (payment_method in ('card', 'cash_on_delivery')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  status text not null default 'placed' check (status in ('placed', 'confirmed', 'assigned', 'packed', 'out_for_delivery', 'delivered', 'cancelled')),
  shipping_address jsonb not null,
  subtotal numeric not null,
  delivery_fee numeric not null default 0,
  tax numeric not null,
  total numeric not null,
  status_history jsonb[] not null default array[jsonb_build_object('status', 'placed', 'note', '', 'date', now())],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orders_user_created on orders(user_id, created_at desc);

-- ============================================
-- ORDER ITEMS
-- ============================================
create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  name text not null,
  image text not null,
  original_price numeric not null,
  discount_percent numeric not null default 0,
  sale_price numeric not null,
  quantity numeric not null check (quantity >= 1),
  is_reviewed boolean not null default false
);

-- ============================================
-- REVIEWS
-- ============================================
create table reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  order_item_id uuid not null unique references order_items(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  rating numeric not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_reviews_product_created on reviews(product_id, created_at desc);
create index idx_reviews_user_created on reviews(user_id, created_at desc);

-- ============================================
-- STORAGE BUCKET (run via Supabase Dashboard or API)
-- ============================================
-- Go to Supabase Dashboard > Storage > New Bucket
-- Bucket name: images
-- Public: Yes

-- ============================================
-- RLS POLICIES (optional - backend uses service role)
-- ============================================
-- If using anon key, enable RLS and add policies:
-- alter table users enable row level security;
-- alter table categories enable row level security;
-- etc.

-- For backend with service_role key, RLS is bypassed.
-- For anon key, you need permissive policies for all operations.
