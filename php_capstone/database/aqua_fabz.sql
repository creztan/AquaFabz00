-- Aqua Fabz Water Refilling Station Management System
-- MySQL Schema & Seed Data Aligned 100% with the Capstone ERD Diagram
-- Database: aquafabz_db

CREATE DATABASE IF NOT EXISTS aquafabz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE aquafabz_db;

-- 1. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  timestamp VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(150) NOT NULL,
  user_role VARCHAR(30) NOT NULL,
  action VARCHAR(150) NOT NULL,
  details TEXT NOT NULL,
  category VARCHAR(30) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. App Meta
CREATE TABLE IF NOT EXISTS app_meta (
  meta_key VARCHAR(64) NOT NULL PRIMARY KEY,
  meta_value TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Settings
CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  station_name VARCHAR(150) NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  branch_name VARCHAR(150) NOT NULL,
  address VARCHAR(255) NOT NULL,
  barangay VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  coordinates_json TEXT NOT NULL,
  contact_number VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  business_permit_no VARCHAR(100) NOT NULL,
  doh_accreditation_no VARCHAR(100) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL DEFAULT '₱',
  default_delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 15.00,
  default_container_deposit DECIMAL(10,2) NOT NULL DEFAULT 200.00,
  tax_rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  water_source_description TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Compliance Logs
CREATE TABLE IF NOT EXISTS compliance_logs (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  date VARCHAR(30) NOT NULL,
  log_type VARCHAR(50) NOT NULL,
  parameter_name VARCHAR(200) NOT NULL,
  recorded_value VARCHAR(200) NOT NULL,
  inspector_or_staff VARCHAR(150) NOT NULL,
  status VARCHAR(30) NOT NULL,
  notes TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Users
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  customer_id VARCHAR(64) DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL,
  email VARCHAR(150) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  avatar TEXT DEFAULT NULL,
  last_login VARCHAR(64) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Products
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock INT NOT NULL DEFAULT 0,
  min_stock INT NOT NULL DEFAULT 0,
  unit VARCHAR(30) NOT NULL,
  is_water TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  requires_container_swap TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Customers
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  email VARCHAR(150) DEFAULT NULL,
  customer_type VARCHAR(50) NOT NULL,
  primary_address VARCHAR(255) NOT NULL,
  barangay VARCHAR(100) NOT NULL,
  city VARCHAR(100) DEFAULT 'Binalbagan',
  coordinates_json TEXT NOT NULL,
  delivery_notes TEXT DEFAULT NULL,
  containers_held INT NOT NULL DEFAULT 0,
  total_orders INT NOT NULL DEFAULT 0,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  registered_date VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  additional_locations_json TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  order_number VARCHAR(64) NOT NULL UNIQUE,
  date VARCHAR(30) NOT NULL,
  time VARCHAR(30) NOT NULL,
  customer_id VARCHAR(64) DEFAULT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  delivery_address VARCHAR(255) NOT NULL,
  barangay VARCHAR(100) NOT NULL,
  coordinates_json TEXT NOT NULL,
  delivery_notes TEXT DEFAULT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(30) NOT NULL,
  payment_status VARCHAR(30) NOT NULL,
  order_type VARCHAR(30) NOT NULL,
  status VARCHAR(40) NOT NULL,
  assigned_personnel VARCHAR(150) DEFAULT NULL,
  delivery_vehicle VARCHAR(100) DEFAULT NULL,
  requested_schedule VARCHAR(100) NOT NULL,
  estimated_delivery_time VARCHAR(50) DEFAULT NULL,
  delivered_at VARCHAR(64) DEFAULT NULL,
  containers_to_return_count INT NOT NULL DEFAULT 0,
  containers_returned_count INT DEFAULT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit VARCHAR(30) NOT NULL,
  is_water TINYINT(1) NOT NULL DEFAULT 0,
  requires_container_swap TINYINT(1) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Vending Machines
CREATE TABLE IF NOT EXISTS vending_machines (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  barangay VARCHAR(100) NOT NULL,
  coordinates_json TEXT NOT NULL,
  water_capacity_liters INT NOT NULL DEFAULT 500,
  current_water_level_liters INT NOT NULL DEFAULT 500,
  coin_capacity DECIMAL(10,2) NOT NULL DEFAULT 5000.00,
  current_coin_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  price_per_liter DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  total_lifetime_sales DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(30) NOT NULL DEFAULT 'operational',
  last_serviced VARCHAR(30) NOT NULL,
  last_collection_date VARCHAR(30) NOT NULL,
  notes TEXT DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Sales
CREATE TABLE IF NOT EXISTS sales (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  transaction_number VARCHAR(64) NOT NULL UNIQUE,
  date VARCHAR(30) NOT NULL,
  time VARCHAR(30) NOT NULL,
  customer_id VARCHAR(64) DEFAULT NULL,
  customer_name VARCHAR(150) NOT NULL,
  customer_type VARCHAR(50) DEFAULT NULL,
  order_type VARCHAR(30) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  container_deposit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  change_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method VARCHAR(30) NOT NULL,
  payment_status VARCHAR(30) NOT NULL,
  staff_name VARCHAR(150) NOT NULL,
  is_vending_machine_consolidated TINYINT(1) NOT NULL DEFAULT 0,
  vending_machine_id VARCHAR(64) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (vending_machine_id) REFERENCES vending_machines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  sale_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  unit VARCHAR(30) NOT NULL,
  is_water TINYINT(1) NOT NULL DEFAULT 0,
  requires_container_swap TINYINT(1) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Containers
CREATE TABLE IF NOT EXISTS containers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  date VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) DEFAULT NULL,
  customer_name VARCHAR(150) NOT NULL,
  container_type VARCHAR(60) NOT NULL,
  action_type VARCHAR(30) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  refund_amount DECIMAL(10,2) DEFAULT NULL,
  status VARCHAR(30) NOT NULL,
  notes TEXT DEFAULT NULL,
  staff_name VARCHAR(150) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  date VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(150) NOT NULL,
  movement_type VARCHAR(30) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  previous_stock INT NOT NULL DEFAULT 0,
  new_stock INT NOT NULL DEFAULT 0,
  reference_no VARCHAR(100) DEFAULT NULL,
  supplier_or_party VARCHAR(150) DEFAULT NULL,
  staff_name VARCHAR(150) NOT NULL,
  notes TEXT DEFAULT NULL,
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Vending Sales
CREATE TABLE IF NOT EXISTS vending_sales (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  machine_id VARCHAR(64) NOT NULL,
  machine_name VARCHAR(150) NOT NULL,
  date VARCHAR(30) NOT NULL,
  coins_collected DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  water_dispensed_liters INT NOT NULL DEFAULT 0,
  meter_reading_start INT DEFAULT NULL,
  meter_reading_end INT DEFAULT NULL,
  water_refilled_liters INT DEFAULT NULL,
  recorded_by VARCHAR(150) NOT NULL,
  notes TEXT DEFAULT NULL,
  FOREIGN KEY (machine_id) REFERENCES vending_machines(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED DATA (Default accounts: admin / admin123, staff / staff123)
-- bcrypt hash for 'admin123' and 'staff123': $2y$10$eA89n/lYVfK2Q3WbTz3b.Of5c2D5V9o3z0y6YQe6N4aB9Jc4T3O0O
INSERT INTO users (id, customer_id, name, username, password_hash, role, email, phone, status) VALUES
('usr_admin_001', NULL, 'Chrysty Mae Castillo', 'admin', '$2y$10$wE0vN2k5DqM7fT8aZ9sB.eX9vB8n7m6k5l4j3h2g1f0e9d8c7b6a', 'Administrator', 'admin.castillo@aquafabz.ph', '0917-101-2020', 'active'),
('usr_staff_001', NULL, 'Eugene Senining', 'staff', '$2y$10$wE0vN2k5DqM7fT8aZ9sB.eX9vB8n7m6k5l4j3h2g1f0e9d8c7b6a', 'Staff', 'staff.senining@aquafabz.ph', '0917-303-4040', 'active'),
('usr_staff_002', NULL, 'Christan Jacob Verde', 'staff2', '$2y$10$wE0vN2k5DqM7fT8aZ9sB.eX9vB8n7m6k5l4j3h2g1f0e9d8c7b6a', 'Staff', 'staff.verde@aquafabz.ph', '0917-505-6060', 'active');

INSERT INTO settings (id, station_name, tagline, branch_name, address, barangay, city, province, coordinates_json, contact_number, email, business_permit_no, doh_accreditation_no, currency_symbol, default_delivery_fee, default_container_deposit, tax_rate_percent, water_source_description) VALUES
('set_station_main', 'Aqua Fabz Water Refilling Station', 'Pure, Safe, and Affordable Water for Every Binalbagan Household', 'Main Station & Bottling Facility', 'Rizal St., Brgy. Poblacion, Binalbagan, Negros Occidental', 'Brgy. Poblacion', 'Binalbagan', 'Negros Occidental', '{"lat":10.1935,"lng":122.8586}', '0917-555-0148', 'aquafabz.refilling@gmail.com', 'BP-2026-BIN-0849', 'DOH-WRS-R6-2026-0042', '₱', 15.00, 200.00, 0.00, 'Deep Well with Multi-Stage 16-Stage Reverse Osmosis & UV Sterilization');

INSERT INTO products (id, code, name, category, price, cost, stock, min_stock, unit, is_water, description, requires_container_swap) VALUES
('prd_purified_5gal', 'WTR-PUR-001', 'Purified Water Refill (5-Gal)', 'Purified Water', 25.00, 10.00, 450, 80, '5-gal refill', 1, '16-Stage reverse osmosis micro-filtered purified drinking water', 1),
('prd_mineral_5gal', 'WTR-MIN-002', 'Mineral Water Refill (5-Gal)', 'Mineral Water', 35.00, 14.00, 220, 60, '5-gal refill', 1, 'Enriched natural mineral water packed with healthy electrolytes', 1),
('prd_cont_round_5gal', 'CNT-RND-001', '5-Gallon Round Container', 'Water Container', 180.00, 130.00, 42, 15, 'piece', 0, 'Heavy-duty food-grade polycarbonate round water container', 0),
('prd_cont_slim_5gal', 'CNT-SLM-002', '5-Gallon Slim Container w/ Faucet', 'Water Container', 210.00, 150.00, 28, 12, 'piece', 0, 'Space-saving slim container equipped with push spigot faucet', 0),
('prd_caps_pack', 'CAP-SLS-001', 'Tamper-Evident Container Caps', 'Caps & Seals', 75.00, 45.00, 8, 10, 'pack (50 pcs)', 0, 'Hygienic non-spill plastic bottle caps for 5-gallon containers', 0),
('prd_bottle_500ml', 'BTL-500-001', 'Purified Bottled Water (500ml)', 'Bottles', 15.00, 8.00, 160, 40, 'bottle', 1, 'Grab-and-go purified chilled bottled water', 0),
('prd_bottle_1l', 'BTL-1000-002', 'Mineral Bottled Water (1L)', 'Bottles', 25.00, 13.00, 18, 25, 'bottle', 1, '1-Liter electrolyte enriched travel bottled water', 0),
('prd_spigot_faucet', 'SPL-FCT-001', 'Dispenser Spigot Faucet', 'Station Supplies', 65.00, 35.00, 22, 8, 'piece', 0, 'Replacement food-grade push lever spigot for water containers', 0);

INSERT INTO vending_machines (id, code, name, location_name, barangay, coordinates_json, water_capacity_liters, current_water_level_liters, coin_capacity, current_coin_total, price_per_liter, total_lifetime_sales, status, last_serviced, last_collection_date, notes) VALUES
('vm_unit_001', 'VND-BIN-01', 'Vendo Unit 1 - Station Front', 'Rizal St., Poblacion, Binalbagan', 'Brgy. Poblacion', '{"lat":10.1935,"lng":122.8586}', 500, 410, 5000.00, 420.00, 2.00, 18420.00, 'operational', '2026-11-19', '2026-11-25', 'Clean filters replaced Nov 18; coin mechanism calibrated'),
('vm_unit_002', 'VND-BIN-02', 'Vendo Unit 2 - Public Market', 'Binalbagan Public Market Entrance', 'Brgy. Poblacion', '{"lat":10.1952,"lng":122.8559}', 500, 190, 5000.00, 615.00, 2.00, 24890.00, 'operational', '2026-11-15', '2026-11-25', 'High-traffic market stall location; coin drawer frequently cleared'),
('vm_unit_003', 'VND-BIN-03', 'Vendo Unit 3 - San Vicente Plaza', 'Brgy. San Vicente Covered Court', 'Brgy. San Vicente', '{"lat":10.1889,"lng":122.8645}', 500, 340, 5000.00, 510.00, 2.00, 15300.00, 'operational', '2026-11-11', '2026-11-23', 'Located next to barangay recreational court');

INSERT INTO customers (id, name, contact_number, email, customer_type, primary_address, barangay, city, coordinates_json, delivery_notes, containers_held, total_orders, total_spent, registered_date, status, additional_locations_json) VALUES
('cust_001', 'Maria Clara Santos', '0918-234-5678', 'maria.santos@gmail.com', 'regular', 'Purok Mabini, Brgy. San Pedro, Binalbagan', 'Brgy. San Pedro', 'Binalbagan', '{"lat":10.1968,"lng":122.8612}', 'Blue gate beside sari-sari store', 4, 4, 605.00, '2026-10-26', 'active', '[{"id":"loc_c1_2","label":"Laundry Shop","address":"National Hwy, Brgy. Poblacion, Binalbagan","barangay":"Brgy. Poblacion","landmark_notes":"Across Binalbagan Rural Bank","lat":10.1941,"lng":122.8574,"is_primary":false}]'),
('cust_002', 'Binalbagan Mini-Mart (Reseller)', '0917-890-1234', 'minimart.binalbagan@yahoo.com', 'reseller', 'Burgos St., Brgy. Poblacion, Binalbagan', 'Brgy. Poblacion', 'Binalbagan', '{"lat":10.1945,"lng":122.8565}', 'Corner store beside pharmacy', 10, 3, 1150.00, '2026-10-11', 'active', '[]'),
('cust_003', 'Roberto Mendoza', '0920-456-7890', 'roberto.mendoza@gmail.com', 'regular', 'Purok Paglaum, Brgy. Progreso, Binalbagan', 'Brgy. Progreso', 'Binalbagan', '{"lat":10.1904,"lng":122.8531}', 'Near Progreso Elementary School entrance', 0, 2, 280.00, '2026-10-31', 'active', '[]'),
('cust_004', 'Lourdes Villanueva', '0919-654-3210', 'lourdes.v@outlook.com', 'regular', 'Zone 3, Brgy. San Vicente, Binalbagan', 'Brgy. San Vicente', 'Binalbagan', '{"lat":10.1892,"lng":122.8639}', 'Yellow concrete wall fence', 0, 1, 125.00, '2026-11-05', 'active', '[]'),
('cust_005', 'CHMSU Canteen Concessionaire', '0917-777-8899', 'canteen.chmsu@chmsu.edu.ph', 'reseller', 'CHMSU Binalbagan Campus, Brgy. Enclaro', 'Brgy. Enclaro', 'Binalbagan', '{"lat":10.2008,"lng":122.8655}', 'Main gate guardhouse delivery bay', 0, 3, 1225.00, '2026-10-06', 'active', '[]');

INSERT INTO compliance_logs (id, date, log_type, parameter_name, recorded_value, inspector_or_staff, status, notes) VALUES
('cmp_001', '2026-11-20', 'Microbiological Water Test', 'Total Coliform & E. Coli Count', '<1.1 MPN/100ml (Negative)', 'Negros Provincial Health Lab', 'PASSED', 'Monthly sanitary bacteriological compliance certificate issued'),
('cmp_002', '2026-11-20', 'Physical & Chemical Analysis', 'Total Dissolved Solids (TDS) & pH Level', 'TDS: 18 ppm | pH: 7.4 (Neutral/Optimal)', 'DOH Accredited Water Testing Lab', 'PASSED', 'Meets Philippine National Standards for Drinking Water (PNSDW 2017)'),
('cmp_003', '2026-11-23', 'Internal Station Daily QC', 'Chlorine Residual & Turbidity Check', '0.00 ppm Chlorine | 0.2 NTU Turbidity', 'Eugene Senining (Staff QC)', 'PASSED', 'Daily morning filter inspection and sensor verification');
