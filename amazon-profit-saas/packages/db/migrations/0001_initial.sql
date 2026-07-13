CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL DEFAULT false, image text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS user_sessions (
  id text PRIMARY KEY, expires_at timestamptz NOT NULL, token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS auth_accounts (
  id text PRIMARY KEY, account_id text NOT NULL, provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, access_token text,
  refresh_token text, id_token text, access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz, scope text, password text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS auth_verifications (
  id text PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organization_members (
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role IN ('owner','admin','analyst')),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(organization_id,user_id)
);
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL, slug text NOT NULL, currency char(3) NOT NULL DEFAULT 'USD',
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,slug)
);
CREATE TABLE IF NOT EXISTS amazon_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  seller_id text NOT NULL, display_name text NOT NULL, marketplace_id text NOT NULL DEFAULT 'ATVPDKIKX0DER',
  region text NOT NULL DEFAULT 'NA', status text NOT NULL DEFAULT 'pending',
  provider_mode text NOT NULL DEFAULT 'mock', sp_refresh_token_encrypted text,
  connected_at timestamptz,last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS amazon_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), amazon_account_id uuid NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  profile_id text NOT NULL,display_name text NOT NULL,status text NOT NULL DEFAULT 'pending',
  ads_refresh_token_encrypted text,connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),amazon_account_id uuid NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  sku text NOT NULL,asin text NOT NULL,parent_asin text,title text NOT NULL,active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(amazon_account_id,sku)
);
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),amazon_account_id uuid NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  amazon_order_id text NOT NULL,purchase_date timestamptz NOT NULL,order_status text NOT NULL,
  marketplace_id text NOT NULL,currency char(3) NOT NULL DEFAULT 'USD',raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(amazon_account_id,amazon_order_id)
);
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,amazon_order_item_id text NOT NULL,
  sku text NOT NULL,asin text NOT NULL,quantity int NOT NULL,product_revenue numeric(14,2) NOT NULL DEFAULT 0,
  shipping_revenue numeric(14,2) NOT NULL DEFAULT 0,promotional_rebates numeric(14,2) NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS amazon_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_item_id uuid REFERENCES order_items(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,fee_type text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,posted_at timestamptz NOT NULL,raw_payload jsonb
);
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,amazon_order_id text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,refund_admin_fee numeric(14,2) NOT NULL DEFAULT 0,
  refunded_at timestamptz NOT NULL,reason text,raw_payload jsonb
);
CREATE TABLE IF NOT EXISTS ad_spend_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),amazon_account_id uuid NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,advertised_sku text,date date NOT NULL,
  campaign_id text NOT NULL,campaign_name text NOT NULL,campaign_type text NOT NULL DEFAULT 'SP',
  impressions bigint NOT NULL DEFAULT 0,clicks int NOT NULL DEFAULT 0,spend numeric(14,2) NOT NULL DEFAULT 0,
  attributed_sales numeric(14,2) NOT NULL DEFAULT 0,attributed_orders int NOT NULL DEFAULT 0,
  raw_payload jsonb,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cogs_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  sku text NOT NULL,effective_from date NOT NULL,effective_to date,unit_cogs numeric(14,4) NOT NULL DEFAULT 0,
  inbound_freight_per_unit numeric(14,4) NOT NULL DEFAULT 0,customs_per_unit numeric(14,4) NOT NULL DEFAULT 0,
  prep_fee_per_unit numeric(14,4) NOT NULL DEFAULT 0,notes text,
  created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,sku,effective_from)
);
CREATE TABLE IF NOT EXISTS operating_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,date date NOT NULL,category text NOT NULL,
  description text,amount numeric(14,2) NOT NULL
);
CREATE TABLE IF NOT EXISTS raw_amazon_events (
  id bigserial PRIMARY KEY,amazon_account_id uuid NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,
  source text NOT NULL,entity_type text NOT NULL,external_id text,occurred_at timestamptz,payload jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),amazon_account_id uuid REFERENCES amazon_accounts(id) ON DELETE SET NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,trigger text NOT NULL,status text NOT NULL,
  from_date timestamptz,to_date timestamptz,records_processed int NOT NULL DEFAULT 0,error_message text,
  started_at timestamptz,completed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profit_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  amazon_account_id uuid NOT NULL REFERENCES amazon_accounts(id) ON DELETE CASCADE,product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  dimension_key text NOT NULL,sku text,asin text,date date NOT NULL,units int NOT NULL DEFAULT 0,
  product_revenue numeric(14,2) NOT NULL DEFAULT 0,shipping_revenue numeric(14,2) NOT NULL DEFAULT 0,
  promotional_rebates numeric(14,2) NOT NULL DEFAULT 0,referral_fees numeric(14,2) NOT NULL DEFAULT 0,
  fulfillment_fees numeric(14,2) NOT NULL DEFAULT 0,storage_fees numeric(14,2) NOT NULL DEFAULT 0,
  refunds numeric(14,2) NOT NULL DEFAULT 0,refund_admin_fees numeric(14,2) NOT NULL DEFAULT 0,
  ad_spend numeric(14,2) NOT NULL DEFAULT 0,cogs numeric(14,2) NOT NULL DEFAULT 0,
  inbound_freight numeric(14,2) NOT NULL DEFAULT 0,customs numeric(14,2) NOT NULL DEFAULT 0,
  prep_fees numeric(14,2) NOT NULL DEFAULT 0,other_operating_costs numeric(14,2) NOT NULL DEFAULT 0,
  net_profit numeric(14,2) NOT NULL DEFAULT 0,calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(amazon_account_id,date,dimension_key)
);
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  amazon_account_id uuid REFERENCES amazon_accounts(id) ON DELETE CASCADE,severity text NOT NULL,type text NOT NULL,
  title text NOT NULL,message text NOT NULL,entity_type text,entity_id text,acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profit_daily_workspace_date ON profit_daily(workspace_id,date DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_workspace ON sync_runs(workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cogs_lookup ON cogs_history(workspace_id,sku,effective_from DESC);
