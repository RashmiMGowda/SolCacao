SET NAMES utf8mb4;

SET @demo_password_hash = '$2b$10$/cvem/QHLDhB8RYarFjqN.ZIf.J9XyM0N5JQaN92lLpMdY.hnk2Xm';

INSERT INTO users
  (id, first_name, last_name, email, password_hash, phone, role, account_type, preferred_language, is_active)
VALUES
  ('usr-retail-demo', 'Alex', 'Morgan', 'customer@solcacao.test', @demo_password_hash, '555-0101', 'CUSTOMER', 'RETAIL', 'en', TRUE),
  ('usr-b2b-approved', 'Jamie', 'Rivera', 'business@solcacao.test', @demo_password_hash, '555-0202', 'BUSINESS', 'B2B', 'en', TRUE),
  ('usr-b2b-pending', 'Morgan', 'Rivera', 'pending@solcacao.test', @demo_password_hash, '555-0203', 'BUSINESS', 'B2B', 'en', TRUE),
  ('usr-b2b-boutique', 'Priya', 'Shah', 'boutique@solcacao.test', @demo_password_hash, '555-0210', 'BUSINESS', 'B2B', 'en', TRUE),
  ('usr-b2b-cafe', 'Mateo', 'Cruz', 'cafe@solcacao.test', @demo_password_hash, '555-0211', 'BUSINESS', 'B2B', 'en', TRUE),
  ('usr-b2b-rejected', 'Taylor', 'Kim', 'rejected@solcacao.test', @demo_password_hash, '555-0212', 'BUSINESS', 'B2B', 'en', TRUE),
  ('usr-admin-demo', 'SolCacao', 'Admin', 'admin@solcacao.test', @demo_password_hash, '555-0303', 'ADMIN', 'B2B', 'en', TRUE)
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  password_hash = VALUES(password_hash),
  phone = VALUES(phone),
  role = VALUES(role),
  account_type = VALUES(account_type),
  preferred_language = VALUES(preferred_language),
  is_active = TRUE;

INSERT INTO addresses
  (id, user_id, label, street, city, state, postal_code, country, is_default)
VALUES
  ('addr-retail-home', 'usr-retail-demo', 'Home', '123 Cocoa Lane', 'Arlington', 'TX', '76010', 'United States', TRUE)
ON DUPLICATE KEY UPDATE
  street = VALUES(street),
  city = VALUES(city),
  state = VALUES(state),
  postal_code = VALUES(postal_code),
  country = VALUES(country),
  is_default = TRUE;

INSERT INTO corporate_partners
  (id, user_id, company_name, industry, business_phone, website, approval_status, reviewed_at, rejection_reason)
VALUES
  ('corp-approved', 'usr-b2b-approved', 'Cacao Hospitality Group', 'Hotel / Hospitality', '555-0202', 'https://cacaohospitality.example', 'APPROVED', '2026-09-02 09:00:00', NULL),
  ('corp-pending', 'usr-b2b-pending', 'Gather Events', 'Corporate Events', '555-0203', NULL, 'PENDING', NULL, NULL),
  ('corp-boutique', 'usr-b2b-boutique', 'Bean & Bloom Boutique', 'Retail / Boutique', '555-0210', 'https://beanbloom.example', 'PENDING', NULL, NULL),
  ('corp-cafe', 'usr-b2b-cafe', 'Cocoa Table Cafe', 'Restaurant / Cafe', '555-0211', NULL, 'PENDING', NULL, NULL),
  ('corp-rejected', 'usr-b2b-rejected', 'Northstar Events', 'Corporate Events', '555-0212', 'https://northstar.example', 'REJECTED', '2026-09-12 14:30:00', 'Please add business phone verification and company website details.')
ON DUPLICATE KEY UPDATE
  company_name = VALUES(company_name),
  industry = VALUES(industry),
  business_phone = VALUES(business_phone),
  website = VALUES(website),
  approval_status = VALUES(approval_status),
  reviewed_at = VALUES(reviewed_at),
  rejection_reason = VALUES(rejection_reason);
