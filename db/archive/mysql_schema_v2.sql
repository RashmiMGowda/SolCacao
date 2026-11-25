-- ARCHIVED DESIGN ONLY. Use npm run db:prepare from server/ for the current schema.
-- SolCacao — MySQL Database Schema


SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- AUTH / USERS
-- =========================================================
CREATE TABLE users (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  role ENUM('CUSTOMER','BUSINESS','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  account_type ENUM('RETAIL','B2B') NOT NULL DEFAULT 'RETAIL',
  preferred_language ENUM('en','es') NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE addresses (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(60) NOT NULL,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE corporate_partners (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  company_name VARCHAR(160) NOT NULL,
  industry VARCHAR(100) NOT NULL,
  business_phone VARCHAR(30) NOT NULL,
  website VARCHAR(255) NULL,
  approval_status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
  reviewed_at DATETIME NULL,
  rejection_reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_corppartner_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- CATALOG
-- =========================================================
CREATE TABLE categories (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE products (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  category_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  origin VARCHAR(100) NOT NULL,
  cacao_percentage INT NOT NULL,
  type VARCHAR(60) NOT NULL,
  weight_label VARCHAR(60) NOT NULL,
  price_cents INT NOT NULL,
  is_seasonal BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE product_translations (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  locale_code ENUM('en','es') NOT NULL,
  translated_name VARCHAR(160) NOT NULL,
  translated_description TEXT NOT NULL,
  translated_region VARCHAR(160) NULL,
  translated_features TEXT NULL,
  UNIQUE KEY uk_product_locale (product_id, locale_code),
  CONSTRAINT fk_prodtrans_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT fk_prodimg_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE inventory (
  product_id CHAR(36) NOT NULL PRIMARY KEY,
  sku VARCHAR(80) NOT NULL UNIQUE,
  on_hand INT NOT NULL DEFAULT 0,
  reserved INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- CART
-- =========================================================
CREATE TABLE carts (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id CHAR(36) NULL,
  session_id VARCHAR(128) NULL,
  status ENUM('ACTIVE','CONVERTED','ABANDONED') NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- SAMPLER (created before cart_items, which references it)
-- =========================================================
CREATE TABLE custom_samplers (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  box_size INT NOT NULL,
  packaging_type VARCHAR(80) NOT NULL,
  gift_message TEXT NULL,
  base_price_cents INT NOT NULL,
  packaging_fee_cents INT NOT NULL DEFAULT 0,
  total_price_cents INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE custom_sampler_items (
  custom_sampler_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (custom_sampler_id, product_id),
  CONSTRAINT fk_samitems_sampler FOREIGN KEY (custom_sampler_id) REFERENCES custom_samplers(id) ON DELETE CASCADE,
  CONSTRAINT fk_samitems_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB;

CREATE TABLE cart_items (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  cart_id CHAR(36) NOT NULL,
  item_type ENUM('PRODUCT','SAMPLER') NOT NULL,
  product_id CHAR(36) NULL,
  custom_sampler_id CHAR(36) NULL,
  quantity INT NOT NULL,
  unit_price_cents INT NOT NULL,
  CONSTRAINT fk_cartitems_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cartitems_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_cartitems_sampler FOREIGN KEY (custom_sampler_id) REFERENCES custom_samplers(id) ON DELETE CASCADE,
  CONSTRAINT chk_cartitems_type CHECK (
    (item_type = 'PRODUCT' AND product_id IS NOT NULL AND custom_sampler_id IS NULL) OR
    (item_type = 'SAMPLER' AND custom_sampler_id IS NOT NULL AND product_id IS NULL)
  )
) ENGINE=InnoDB;

-- =========================================================
-- D2C ORDERS
-- =========================================================
CREATE TABLE orders (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  user_id CHAR(36) NULL,
  checkout_email VARCHAR(255) NOT NULL,
  checkout_phone VARCHAR(30) NULL,
  status ENUM('PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED') NOT NULL DEFAULT 'PAID',
  subtotal_cents INT NOT NULL,
  tax_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  item_type ENUM('PRODUCT','SAMPLER') NOT NULL,
  product_id CHAR(36) NULL,
  custom_sampler_id CHAR(36) NULL,
  product_name_snapshot VARCHAR(180) NOT NULL,
  item_description_snapshot TEXT NULL,
  quantity INT NOT NULL,
  unit_price_cents INT NOT NULL,
  CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_orderitems_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_orderitems_sampler FOREIGN KEY (custom_sampler_id) REFERENCES custom_samplers(id) ON DELETE SET NULL
  -- NOTE: no CHECK constraint here on purpose. MariaDB rejects a CHECK on any column
  -- that has an ON DELETE SET NULL foreign key action (tested: error 1901). Since
  -- product_id/custom_sampler_id must stay nullable so order history survives a
  -- deleted product (scope rule: "Order Items Preserve History"), the
  -- "exactly one of product_id/custom_sampler_id at creation time" rule must be
  -- enforced in the application layer (service/validator), not the database.
) ENGINE=InnoDB;

CREATE TABLE order_addresses (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id CHAR(36) NOT NULL UNIQUE,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  CONSTRAINT fk_orderaddr_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payments (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  transaction_ref VARCHAR(120) NULL UNIQUE,
  amount_cents INT NOT NULL,
  payment_method VARCHAR(80) NOT NULL,
  payment_status ENUM('PENDING','COMPLETED','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  status ENUM('PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED') NOT NULL,
  notes TEXT NULL,
  changed_by CHAR(36) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orderhist_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_orderhist_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE shipments (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  order_id CHAR(36) NOT NULL UNIQUE,
  carrier VARCHAR(100) NULL,
  tracking_number VARCHAR(120) NULL,
  expected_delivery_at DATETIME NULL,
  shipped_at DATETIME NULL,
  delivered_at DATETIME NULL,
  CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =========================================================
-- B2B
-- =========================================================
CREATE TABLE b2b_custom_requests (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  corporate_partner_id CHAR(36) NOT NULL,
  cacao_profile VARCHAR(160) NOT NULL,
  quantity_kg INT NOT NULL,
  brand_campaign_name VARCHAR(160) NULL,
  custom_mold_details TEXT NULL,
  packaging_type VARCHAR(100) NOT NULL,
  white_label BOOLEAN NOT NULL DEFAULT FALSE,
  special_instructions TEXT NULL,
  status ENUM('SUBMITTED','UNDER_REVIEW','QUOTED','ACCEPTED','DECLINED','CLOSED') NOT NULL DEFAULT 'SUBMITTED',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_b2breq_partner FOREIGN KEY (corporate_partner_id) REFERENCES corporate_partners(id)
) ENGINE=InnoDB;

CREATE TABLE b2b_request_files (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  b2b_request_id CHAR(36) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_b2bfiles_request FOREIGN KEY (b2b_request_id) REFERENCES b2b_custom_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE b2b_request_status_history (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  b2b_request_id CHAR(36) NOT NULL,
  status ENUM('SUBMITTED','UNDER_REVIEW','QUOTED','ACCEPTED','DECLINED','CLOSED') NOT NULL,
  notes TEXT NULL,
  changed_by CHAR(36) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_b2bhist_request FOREIGN KEY (b2b_request_id) REFERENCES b2b_custom_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_b2bhist_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE b2b_quotes (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  b2b_request_id CHAR(36) NOT NULL UNIQUE,
  quote_number VARCHAR(40) NOT NULL UNIQUE,
  quoted_amount_cents INT NOT NULL,
  valid_until DATETIME NOT NULL,
  admin_notes TEXT NULL,
  created_by CHAR(36) NOT NULL,
  status ENUM('DRAFT','SENT','ACCEPTED','DECLINED','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_b2bquotes_request FOREIGN KEY (b2b_request_id) REFERENCES b2b_custom_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_b2bquotes_user FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- =========================================================
-- CONTACT / FEEDBACK
-- =========================================================
CREATE TABLE inquiries (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  user_id CHAR(36) NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  category ENUM('CONTACT','FEEDBACK') NOT NULL,
  subject VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  rating INT NULL,
  status ENUM('NEW','REVIEWING','CLOSED') NOT NULL DEFAULT 'NEW',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inquiries_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_inquiries_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- =========================================================
-- LOCALIZATION (Student 2)
-- =========================================================
CREATE TABLE translation_keys (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  namespace VARCHAR(80) NOT NULL,
  key_name VARCHAR(160) NOT NULL,
  UNIQUE KEY uk_namespace_key (namespace, key_name)
) ENGINE=InnoDB;

CREATE TABLE translation_values (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  translation_key_id CHAR(36) NOT NULL,
  locale_code ENUM('en','es') NOT NULL,
  translated_value TEXT NOT NULL,
  UNIQUE KEY uk_key_locale (translation_key_id, locale_code),
  CONSTRAINT fk_transvalues_key FOREIGN KEY (translation_key_id) REFERENCES translation_keys(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
