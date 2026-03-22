CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('customer', 'courier', 'merchant_owner', 'merchant_manager', 'admin', 'ops');
CREATE TYPE merchant_status AS ENUM ('pending', 'active', 'paused', 'suspended');
CREATE TYPE fulfillment_mode AS ENUM ('merchant_delivery', 'platform_delivery', 'hybrid');
CREATE TYPE order_status AS ENUM (
  'draft', 'pricing_validated', 'payment_pending', 'placed', 'merchant_received',
  'preparing', 'ready_for_pickup', 'courier_assigned', 'picked_up', 'in_delivery',
  'delivered', 'rejected_by_merchant', 'cancelled_by_customer', 'cancelled_by_platform',
  'failed_delivery', 'refunded'
);
CREATE TYPE payout_status AS ENUM ('scheduled', 'processing', 'paid', 'failed');
CREATE TYPE vehicle_type AS ENUM ('bike', 'motorcycle', 'car', 'van');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  module_code TEXT NOT NULL,
  coverage_area GEOGRAPHY(MULTIPOLYGON, 4326) NOT NULL,
  base_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  fee_per_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  surge_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES users(id),
  legal_name TEXT NOT NULL,
  trade_name TEXT NOT NULL,
  module_code TEXT NOT NULL,
  status merchant_status NOT NULL DEFAULT 'pending',
  fulfillment_mode fulfillment_mode NOT NULL,
  average_prep_time_min INTEGER NOT NULL DEFAULT 20,
  delivery_radius_km NUMERIC(8,2),
  custom_delivery_fee NUMERIC(10,2),
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 5,
  address_json JSONB NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE merchant_zones (
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  zone_id UUID NOT NULL REFERENCES zones(id),
  PRIMARY KEY (merchant_id, zone_id)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  category_id UUID NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  base_price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  stock_quantity INTEGER,
  track_stock BOOLEAN NOT NULL DEFAULT FALSE,
  availability_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_modifier_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  name TEXT NOT NULL,
  min_select INTEGER NOT NULL DEFAULT 0,
  max_select INTEGER NOT NULL DEFAULT 1,
  required BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE product_modifiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modifier_group_id UUID NOT NULL REFERENCES product_modifier_groups(id),
  name TEXT NOT NULL,
  price_delta NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE customers (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  default_zone_id UUID REFERENCES zones(id),
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE couriers (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  vehicle vehicle_type NOT NULL,
  zone_id UUID REFERENCES zones(id),
  score NUMERIC(5,2) NOT NULL DEFAULT 100,
  level_code TEXT,
  cash_wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_online BOOLEAN NOT NULL DEFAULT FALSE,
  current_location GEOGRAPHY(POINT, 4326),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_user_id UUID NOT NULL REFERENCES users(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  zone_id UUID NOT NULL REFERENCES zones(id),
  status order_status NOT NULL DEFAULT 'draft',
  payment_method TEXT,
  payment_status TEXT,
  subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  service_fee_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  quoted_prep_time_min INTEGER,
  quoted_eta_min INTEGER,
  delivery_address_json JSONB NOT NULL,
  timeline_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  placed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  product_name_snapshot TEXT NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  modifiers_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT
);

CREATE TABLE delivery_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id),
  courier_user_id UUID REFERENCES users(id),
  status TEXT NOT NULL,
  pickup_eta_at TIMESTAMPTZ,
  dropoff_eta_at TIMESTAMPTZ,
  route_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  proof_of_delivery_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_type TEXT NOT NULL,
  account_id UUID NOT NULL,
  order_id UUID REFERENCES orders(id),
  direction TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',
  entry_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  beneficiary_type TEXT NOT NULL,
  beneficiary_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  status payout_status NOT NULL DEFAULT 'scheduled',
  external_reference TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ
);

CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  scope_type TEXT NOT NULL,
  scope_id UUID,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC(10,2) NOT NULL,
  max_discount NUMERIC(10,2),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  rules_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_merchants_location ON merchants USING GIST (location);
CREATE INDEX idx_zones_coverage ON zones USING GIST (coverage_area);
CREATE INDEX idx_orders_merchant_status ON orders (merchant_id, status, created_at DESC);
CREATE INDEX idx_delivery_tasks_courier_status ON delivery_tasks (courier_user_id, status);
CREATE INDEX idx_products_merchant_active ON products (merchant_id, active);
