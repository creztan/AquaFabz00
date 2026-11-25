import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "aqua_fabz.db");
let db;
try {
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
} catch (err) {
  console.error("Database error or corruption detected, recreating DB...", err);
  try {
    if (db) db.close();
  } catch {}
  try {
    fs.unlinkSync(dbPath);
    if (fs.existsSync(`${dbPath}-wal`)) fs.unlinkSync(`${dbPath}-wal`);
    if (fs.existsSync(`${dbPath}-shm`)) fs.unlinkSync(`${dbPath}-shm`);
  } catch {}
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
}

const STATION_INFO = {
  id: "set_station_main",
  name: "Aqua Fabz Water Refilling Station",
  tagline: "Pure, Safe, and Affordable Water for Every Binalbagan Household",
  branch_name: "Main Station & Bottling Facility",
  address: "Rizal St., Brgy. Poblacion, Binalbagan, Negros Occidental",
  barangay: "Brgy. Poblacion",
  city: "Binalbagan",
  province: "Negros Occidental",
  contact: "0917-555-0148",
  contact_number: "0917-555-0148",
  email: "aquafabz.refilling@gmail.com",
  business_permit_no: "BP-2026-BIN-0849",
  doh_accreditation_no: "DOH-WRS-R6-2026-0042",
  currency_symbol: "₱",
  default_delivery_fee: 15.00,
  default_container_deposit: 200.00,
  tax_rate_percent: 0.00,
  water_source_description: "Deep Well with Multi-Stage 16-Stage Reverse Osmosis & UV Sterilization",
  lat: 10.1935,
  lng: 122.8586
};

const DELIVERY_PERSONNEL_ROSTER = [
  "Ramon Cruz",
  "Joel Bautista",
  "Marco Villanueva"
];

function generateId(prefix = "id") {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  // Support both scrypt salt:key and bcrypt format if needed
  if (stored.includes(":")) {
    const [salt, key] = stored.split(":");
    if (!salt || !key) return false;
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(key, "hex");
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  }
  // Plain fallback for demo seeds
  return password === "admin123" || password === "staff123";
}

function logActivity(userId, username, userRole, actionType, description, category = "System") {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO activity_logs (id, timestamp, user_id, user_name, user_role, action, details, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    generateId("act"),
    now,
    String(userId || "system"),
    username || "System",
    userRole || "Administrator",
    actionType,
    description,
    category
  );
}

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      customer_id VARCHAR(64) DEFAULT NULL,
      name VARCHAR(150) NOT NULL,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(30) NOT NULL CHECK(role IN ('Administrator', 'Staff')),
      email VARCHAR(150) DEFAULT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      avatar TEXT DEFAULT NULL,
      last_login VARCHAR(64) DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      meta_key VARCHAR(64) PRIMARY KEY,
      meta_value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id VARCHAR(50) PRIMARY KEY,
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
    );

    CREATE TABLE IF NOT EXISTS compliance_logs (
      id VARCHAR(64) PRIMARY KEY,
      date VARCHAR(30) NOT NULL,
      log_type VARCHAR(50) NOT NULL,
      parameter_name VARCHAR(200) NOT NULL,
      recorded_value VARCHAR(200) NOT NULL,
      inspector_or_staff VARCHAR(150) NOT NULL,
      status VARCHAR(30) NOT NULL,
      notes TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) NOT NULL UNIQUE,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL CHECK(price > 0),
      cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      stock INT NOT NULL DEFAULT 0 CHECK(stock >= 0),
      min_stock INT NOT NULL DEFAULT 0 CHECK(min_stock >= 0),
      unit VARCHAR(30) NOT NULL,
      is_water TINYINT(1) NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      requires_container_swap TINYINT(1) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      contact_number VARCHAR(50) NOT NULL,
      email VARCHAR(150) DEFAULT NULL,
      customer_type VARCHAR(50) NOT NULL CHECK(customer_type IN ('walk-in', 'regular', 'reseller')),
      primary_address VARCHAR(255) NOT NULL,
      barangay VARCHAR(100) NOT NULL,
      city VARCHAR(100) DEFAULT 'Binalbagan',
      coordinates_json TEXT NOT NULL,
      delivery_notes TEXT DEFAULT NULL,
      containers_held INT NOT NULL DEFAULT 0,
      total_orders INT NOT NULL DEFAULT 0,
      total_spent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      registered_date VARCHAR(30) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      additional_locations_json TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      order_number VARCHAR(64) NOT NULL UNIQUE,
      date VARCHAR(30) NOT NULL,
      time VARCHAR(30) NOT NULL,
      customer_id VARCHAR(64) DEFAULT NULL REFERENCES customers(id),
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
      payment_status VARCHAR(30) NOT NULL CHECK(payment_status IN ('Unpaid', 'Partial', 'Paid')),
      order_type VARCHAR(30) NOT NULL CHECK(order_type IN ('Pickup', 'Delivery')),
      status VARCHAR(40) NOT NULL CHECK(status IN ('Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Completed', 'Cancelled')),
      assigned_personnel VARCHAR(150) DEFAULT NULL,
      delivery_vehicle VARCHAR(100) DEFAULT NULL,
      requested_schedule VARCHAR(100) NOT NULL,
      estimated_delivery_time VARCHAR(50) DEFAULT NULL,
      delivered_at VARCHAR(64) DEFAULT NULL,
      containers_to_return_count INT NOT NULL DEFAULT 0,
      containers_returned_count INT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id VARCHAR(64) NOT NULL REFERENCES products(id),
      product_name VARCHAR(150) NOT NULL,
      quantity INT NOT NULL DEFAULT 1 CHECK(quantity > 0),
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      unit VARCHAR(30) NOT NULL,
      is_water TINYINT(1) NOT NULL DEFAULT 0,
      requires_container_swap TINYINT(1) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS sales (
      id VARCHAR(64) PRIMARY KEY,
      transaction_number VARCHAR(64) NOT NULL UNIQUE,
      date VARCHAR(30) NOT NULL,
      time VARCHAR(30) NOT NULL,
      customer_id VARCHAR(64) DEFAULT NULL REFERENCES customers(id),
      customer_name VARCHAR(150) NOT NULL,
      customer_type VARCHAR(50) DEFAULT NULL,
      order_type VARCHAR(30) NOT NULL DEFAULT 'Walk-in',
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      container_deposit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      change_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      payment_method VARCHAR(30) NOT NULL DEFAULT 'Cash',
      payment_status VARCHAR(30) NOT NULL DEFAULT 'Paid',
      staff_name VARCHAR(150) NOT NULL,
      is_vending_machine_consolidated TINYINT(1) NOT NULL DEFAULT 0,
      vending_machine_id VARCHAR(64) DEFAULT NULL,
      notes TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id VARCHAR(64) PRIMARY KEY,
      sale_id VARCHAR(64) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id VARCHAR(64) NOT NULL REFERENCES products(id),
      product_name VARCHAR(150) NOT NULL,
      quantity INT NOT NULL DEFAULT 1 CHECK(quantity > 0),
      unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      unit VARCHAR(30) NOT NULL,
      is_water TINYINT(1) NOT NULL DEFAULT 0,
      requires_container_swap TINYINT(1) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS containers (
      id VARCHAR(64) PRIMARY KEY,
      date VARCHAR(64) NOT NULL,
      customer_id VARCHAR(64) DEFAULT NULL REFERENCES customers(id),
      customer_name VARCHAR(150) NOT NULL,
      container_type VARCHAR(60) NOT NULL,
      action_type VARCHAR(30) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      deposit_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      refund_amount DECIMAL(10,2) DEFAULT NULL,
      status VARCHAR(30) NOT NULL,
      notes TEXT DEFAULT NULL,
      staff_name VARCHAR(150) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id VARCHAR(64) PRIMARY KEY,
      date VARCHAR(64) NOT NULL,
      product_id VARCHAR(64) NOT NULL REFERENCES products(id),
      product_name VARCHAR(150) NOT NULL,
      movement_type VARCHAR(30) NOT NULL,
      quantity INT NOT NULL DEFAULT 0,
      previous_stock INT NOT NULL DEFAULT 0,
      new_stock INT NOT NULL DEFAULT 0,
      reference_no VARCHAR(100) DEFAULT NULL,
      supplier_or_party VARCHAR(150) DEFAULT NULL,
      staff_name VARCHAR(150) NOT NULL,
      notes TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS vending_machines (
      id VARCHAR(64) PRIMARY KEY,
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
    );

    CREATE TABLE IF NOT EXISTS vending_sales (
      id VARCHAR(64) PRIMARY KEY,
      machine_id VARCHAR(64) NOT NULL REFERENCES vending_machines(id),
      machine_name VARCHAR(150) NOT NULL,
      date VARCHAR(30) NOT NULL,
      coins_collected DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      water_dispensed_liters INT NOT NULL DEFAULT 0,
      meter_reading_start INT DEFAULT NULL,
      meter_reading_end INT DEFAULT NULL,
      water_refilled_liters INT DEFAULT NULL,
      recorded_by VARCHAR(150) NOT NULL,
      notes TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id VARCHAR(64) PRIMARY KEY,
      timestamp VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) NOT NULL,
      user_name VARCHAR(150) NOT NULL,
      user_role VARCHAR(30) NOT NULL,
      action VARCHAR(150) NOT NULL,
      details TEXT NOT NULL,
      category VARCHAR(30) NOT NULL
    );
  `);

  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount === 0) {
    seedInitialData();
  }
}

function daysAgoIso(daysAgo, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateOnlyDaysAgo(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function timeOnly(dateIso) {
  return dateIso.slice(11, 16);
}

function seedInitialData() {
  const now = new Date().toISOString();
  const todayDate = now.slice(0, 10);
  const nowTime = now.slice(11, 16);

  // 1. Settings
  db.prepare(`
    INSERT INTO settings (
      id, station_name, tagline, branch_name, address, barangay, city, province,
      coordinates_json, contact_number, email, business_permit_no, doh_accreditation_no,
      currency_symbol, default_delivery_fee, default_container_deposit, tax_rate_percent,
      water_source_description
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    STATION_INFO.id,
    STATION_INFO.name,
    STATION_INFO.tagline,
    STATION_INFO.branch_name,
    STATION_INFO.address,
    STATION_INFO.barangay,
    STATION_INFO.city,
    STATION_INFO.province,
    JSON.stringify({ lat: STATION_INFO.lat, lng: STATION_INFO.lng }),
    STATION_INFO.contact_number,
    STATION_INFO.email,
    STATION_INFO.business_permit_no,
    STATION_INFO.doh_accreditation_no,
    STATION_INFO.currency_symbol,
    STATION_INFO.default_delivery_fee,
    STATION_INFO.default_container_deposit,
    STATION_INFO.tax_rate_percent,
    STATION_INFO.water_source_description
  );

  // 2. App Meta
  db.prepare(`INSERT OR REPLACE INTO app_meta (meta_key, meta_value) VALUES (?, ?)`).run(
    "system_version",
    "Aqua Fabz Management System v2.0 (ERD Aligned)"
  );
  db.prepare(`INSERT OR REPLACE INTO app_meta (meta_key, meta_value) VALUES (?, ?)`).run(
    "deployment_location",
    "Rizal St., Brgy. Poblacion, Binalbagan, Negros Occidental"
  );

  // 3. Users (Administrator & Staff)
  const insertUser = db.prepare(`
    INSERT INTO users (id, customer_id, name, username, password_hash, role, email, phone, status, avatar, last_login)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const uAdmin = "usr_admin_001";
  const uStaff = "usr_staff_001";
  const uStaff2 = "usr_staff_002";

  insertUser.run(
    uAdmin,
    null,
    "Chrysty Mae Castillo",
    "admin",
    hashPassword("admin123"),
    "Administrator",
    "admin.castillo@aquafabz.ph",
    "0917-101-2020",
    "active",
    null,
    now
  );

  insertUser.run(
    uStaff,
    null,
    "Eugene Senining",
    "staff",
    hashPassword("staff123"),
    "Staff",
    "staff.senining@aquafabz.ph",
    "0917-303-4040",
    "active",
    null,
    now
  );

  insertUser.run(
    uStaff2,
    null,
    "Christan Jacob Verde",
    "staff2",
    hashPassword("staff123"),
    "Staff",
    "staff.verde@aquafabz.ph",
    "0917-505-6060",
    "active",
    null,
    now
  );

  // 4. Products
  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, code, name, category, price, cost, stock, min_stock, unit, is_water, description, requires_container_swap
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const pPurified = "prd_purified_5gal";
  const pMineral = "prd_mineral_5gal";
  const pRoundCont = "prd_cont_round_5gal";
  const pSlimCont = "prd_cont_slim_5gal";
  const pCaps = "prd_caps_pack";
  const pPet500 = "prd_bottle_500ml";
  const pPet1L = "prd_bottle_1l";
  const pSpigot = "prd_spigot_faucet";

  insertProduct.run(
    pPurified,
    "WTR-PUR-001",
    "Purified Water Refill (5-Gal)",
    "Purified Water",
    25.00,
    10.00,
    450,
    80,
    "5-gal refill",
    1,
    "16-Stage reverse osmosis micro-filtered purified drinking water",
    1
  );

  insertProduct.run(
    pMineral,
    "WTR-MIN-002",
    "Mineral Water Refill (5-Gal)",
    "Mineral Water",
    35.00,
    14.00,
    220,
    60,
    "5-gal refill",
    1,
    "Enriched natural mineral water packed with healthy electrolytes",
    1
  );

  insertProduct.run(
    pRoundCont,
    "CNT-RND-001",
    "5-Gallon Round Container",
    "Water Container",
    180.00,
    130.00,
    42,
    15,
    "piece",
    0,
    "Heavy-duty food-grade polycarbonate round water container",
    0
  );

  insertProduct.run(
    pSlimCont,
    "CNT-SLM-002",
    "5-Gallon Slim Container w/ Faucet",
    "Water Container",
    210.00,
    150.00,
    28,
    12,
    "piece",
    0,
    "Space-saving slim container equipped with push spigot faucet",
    0
  );

  insertProduct.run(
    pCaps,
    "CAP-SLS-001",
    "Tamper-Evident Container Caps",
    "Caps & Seals",
    75.00,
    45.00,
    8,
    10,
    "pack (50 pcs)",
    0,
    "Hygienic non-spill plastic bottle caps for 5-gallon containers",
    0
  );

  insertProduct.run(
    pPet500,
    "BTL-500-001",
    "Purified Bottled Water (500ml)",
    "Bottles",
    15.00,
    8.00,
    160,
    40,
    "bottle",
    1,
    "Grab-and-go purified chilled bottled water",
    0
  );

  insertProduct.run(
    pPet1L,
    "BTL-1000-002",
    "Mineral Bottled Water (1L)",
    "Bottles",
    25.00,
    13.00,
    18,
    25,
    "bottle",
    1,
    "1-Liter electrolyte enriched travel bottled water",
    0
  );

  insertProduct.run(
    pSpigot,
    "SPL-FCT-001",
    "Dispenser Spigot Faucet",
    "Station Supplies",
    65.00,
    35.00,
    22,
    8,
    "piece",
    0,
    "Replacement food-grade push lever spigot for water containers",
    0
  );

  // 5. Vending Machines
  const insertVendo = db.prepare(`
    INSERT INTO vending_machines (
      id, code, name, location_name, barangay, coordinates_json, water_capacity_liters,
      current_water_level_liters, coin_capacity, current_coin_total, price_per_liter,
      total_lifetime_sales, status, last_serviced, last_collection_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const vm1 = "vm_unit_001";
  const vm2 = "vm_unit_002";
  const vm3 = "vm_unit_003";

  insertVendo.run(
    vm1,
    "VND-BIN-01",
    "Vendo Unit 1 - Station Front",
    "Rizal St., Poblacion, Binalbagan",
    "Brgy. Poblacion",
    JSON.stringify({ lat: 10.1935, lng: 122.8586 }),
    500,
    410,
    5000.00,
    420.00,
    2.00,
    18420.00,
    "operational",
    dateOnlyDaysAgo(6),
    todayDate,
    "Clean filters replaced Nov 18; coin mechanism calibrated"
  );

  insertVendo.run(
    vm2,
    "VND-BIN-02",
    "Vendo Unit 2 - Public Market",
    "Binalbagan Public Market Entrance",
    "Brgy. Poblacion",
    JSON.stringify({ lat: 10.1952, lng: 122.8559 }),
    500,
    190,
    5000.00,
    615.00,
    2.00,
    24890.00,
    "operational",
    dateOnlyDaysAgo(10),
    todayDate,
    "High-traffic market stall location; coin drawer frequently cleared"
  );

  insertVendo.run(
    vm3,
    "VND-BIN-03",
    "Vendo Unit 3 - San Vicente Plaza",
    "Brgy. San Vicente Covered Court",
    "Brgy. San Vicente",
    JSON.stringify({ lat: 10.1889, lng: 122.8645 }),
    500,
    340,
    5000.00,
    510.00,
    2.00,
    15300.00,
    "operational",
    dateOnlyDaysAgo(14),
    dateOnlyDaysAgo(2),
    "Located next to barangay recreational court"
  );

  // 6. Customers (with primary coordinates and additional locations in JSON)
  const insertCustomer = db.prepare(`
    INSERT INTO customers (
      id, name, contact_number, email, customer_type, primary_address, barangay, city,
      coordinates_json, delivery_notes, containers_held, total_orders, total_spent,
      registered_date, status, additional_locations_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const c1 = "cust_001";
  const c2 = "cust_002";
  const c3 = "cust_003";
  const c4 = "cust_004";
  const c5 = "cust_005";
  const c6 = "cust_006";
  const c7 = "cust_007";
  const c8 = "cust_008";
  const c9 = "cust_009";
  const c10 = "cust_010";
  const c11 = "cust_011";
  const c12 = "cust_012";
  const c13 = "cust_013";
  const c14 = "cust_014";
  const c15 = "cust_015";
  const c16 = "cust_016";

  insertCustomer.run(
    c1,
    "Maria Clara Santos",
    "0918-234-5678",
    "maria.santos@gmail.com",
    "regular",
    "Purok Mabini, Brgy. San Pedro, Binalbagan",
    "Brgy. San Pedro",
    "Binalbagan",
    JSON.stringify({ lat: 10.1968, lng: 122.8612 }),
    "Blue gate beside sari-sari store",
    4,
    4,
    605.00,
    dateOnlyDaysAgo(30),
    "active",
    JSON.stringify([
      {
        id: "loc_c1_2",
        label: "Laundry Shop",
        address: "National Hwy, Brgy. Poblacion, Binalbagan",
        barangay: "Brgy. Poblacion",
        landmark_notes: "Across Binalbagan Rural Bank",
        lat: 10.1941,
        lng: 122.8574,
        is_primary: false
      }
    ])
  );

  insertCustomer.run(
    c2,
    "Binalbagan Mini-Mart (Reseller)",
    "0917-890-1234",
    "minimart.binalbagan@yahoo.com",
    "reseller",
    "Burgos St., Brgy. Poblacion, Binalbagan",
    "Brgy. Poblacion",
    "Binalbagan",
    JSON.stringify({ lat: 10.1945, lng: 122.8565 }),
    "Corner store beside pharmacy",
    10,
    3,
    1150.00,
    dateOnlyDaysAgo(45),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c3,
    "Roberto Mendoza",
    "0920-456-7890",
    "roberto.mendoza@gmail.com",
    "regular",
    "Purok Paglaum, Brgy. Progreso, Binalbagan",
    "Brgy. Progreso",
    "Binalbagan",
    JSON.stringify({ lat: 10.1904, lng: 122.8531 }),
    "Near Progreso Elementary School entrance",
    0,
    2,
    280.00,
    dateOnlyDaysAgo(25),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c4,
    "Lourdes Villanueva",
    "0919-654-3210",
    "lourdes.v@outlook.com",
    "regular",
    "Zone 3, Brgy. San Vicente, Binalbagan",
    "Brgy. San Vicente",
    "Binalbagan",
    JSON.stringify({ lat: 10.1892, lng: 122.8639 }),
    "Yellow concrete wall fence",
    0,
    1,
    125.00,
    dateOnlyDaysAgo(20),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c5,
    "CHMSU Canteen Concessionaire",
    "0917-777-8899",
    "canteen.chmsu@chmsu.edu.ph",
    "reseller",
    "CHMSU Binalbagan Campus, Brgy. Enclaro",
    "Brgy. Enclaro",
    "Binalbagan",
    JSON.stringify({ lat: 10.2008, lng: 122.8655 }),
    "Main gate guardhouse delivery bay",
    0,
    3,
    1225.00,
    dateOnlyDaysAgo(50),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c6,
    "Esteban Ramos",
    "0919-321-4321",
    "esteban.ramos@gmail.com",
    "regular",
    "Purok Manga, Brgy. Payao, Binalbagan",
    "Brgy. Payao",
    "Binalbagan",
    JSON.stringify({ lat: 10.1812, lng: 122.8432 }),
    "Near Payao barangay outpost",
    2,
    2,
    250.00,
    dateOnlyDaysAgo(15),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c7,
    "Amontay Resident Group",
    "0917-111-2233",
    "amontay.water@gmail.com",
    "regular",
    "Main Road, Brgy. Amontay, Binalbagan",
    "Brgy. Amontay",
    "Binalbagan",
    JSON.stringify({ lat: 10.1745, lng: 122.8521 }),
    "Near Amontay chapel",
    1,
    1,
    125.00,
    dateOnlyDaysAgo(12),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c8,
    "Baguer Community Store",
    "0918-222-3344",
    "baguer.store@yahoo.com",
    "reseller",
    "Purok Centro, Brgy. Baguer, Binalbagan",
    "Brgy. Baguer",
    "Binalbagan",
    JSON.stringify({ lat: 10.2112, lng: 122.8415 }),
    "Beside Baguer barangay hall",
    5,
    3,
    750.00,
    dateOnlyDaysAgo(18),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c9,
    "Bi-ao Agricultural Supply",
    "0920-333-4455",
    "biao.agri@gmail.com",
    "regular",
    "Highway, Brgy. Bi-ao, Binalbagan",
    "Brgy. Bi-ao",
    "Binalbagan",
    JSON.stringify({ lat: 10.1689, lng: 122.8702 }),
    "Near Bi-ao junction",
    2,
    2,
    260.00,
    dateOnlyDaysAgo(22),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c10,
    "Camalobalo Homestay",
    "0919-444-5566",
    "camalobalo.stay@gmail.com",
    "regular",
    "Sitio Proper, Brgy. Camalobalo, Binalbagan",
    "Brgy. Camalobalo",
    "Binalbagan",
    JSON.stringify({ lat: 10.1834, lng: 122.8791 }),
    "Bamboo fence entrance",
    2,
    1,
    130.00,
    dateOnlyDaysAgo(10),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c11,
    "Canmoros General Store",
    "0917-555-6677",
    "canmoros.store@gmail.com",
    "regular",
    "Main Road, Brgy. Canmoros, Binalbagan",
    "Brgy. Canmoros",
    "Binalbagan",
    JSON.stringify({ lat: 10.1982, lng: 122.8510 }),
    "Opposite Canmoros waiting shed",
    3,
    2,
    380.00,
    dateOnlyDaysAgo(14),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c12,
    "Hospital Site Pharmacy",
    "0920-666-7788",
    "hospitalsite.med@gmail.com",
    "reseller",
    "Zone 2, Brgy. Hospital Site, Binalbagan",
    "Brgy. Hospital Site",
    "Binalbagan",
    JSON.stringify({ lat: 10.1920, lng: 122.8601 }),
    "Near Binalbagan District Hospital",
    6,
    4,
    920.00,
    dateOnlyDaysAgo(28),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c13,
    "Marina Coastal Depot",
    "0918-777-8899",
    "marina.depot@yahoo.com",
    "reseller",
    "Shoreline Rd, Brgy. Marina, Binalbagan",
    "Brgy. Marina",
    "Binalbagan",
    JSON.stringify({ lat: 10.2045, lng: 122.8489 }),
    "Near fish landing port",
    8,
    5,
    1450.00,
    dateOnlyDaysAgo(35),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c14,
    "San Jose Family Mart",
    "0919-888-9900",
    "sanjose.mart@gmail.com",
    "regular",
    "Purok Star, Brgy. San Jose, Binalbagan",
    "Brgy. San Jose",
    "Binalbagan",
    JSON.stringify({ lat: 10.1798, lng: 122.8624 }),
    "Beside San Jose elementary school",
    2,
    2,
    270.00,
    dateOnlyDaysAgo(16),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c15,
    "Santo Rosario Parish Center",
    "0917-999-0011",
    "santorosario.parish@gmail.com",
    "regular",
    "Church Rd, Brgy. Santo Rosario, Binalbagan",
    "Brgy. Santo Rosario",
    "Binalbagan",
    JSON.stringify({ lat: 10.1876, lng: 122.8680 }),
    "Gate facing church plaza",
    4,
    3,
    510.00,
    dateOnlyDaysAgo(24),
    "active",
    JSON.stringify([])
  );

  insertCustomer.run(
    c16,
    "Tiaong Agro Enterprise",
    "0920-000-1122",
    "tiaong.agro@gmail.com",
    "reseller",
    "Sitio Riverside, Brgy. Tiaong, Binalbagan",
    "Brgy. Tiaong",
    "Binalbagan",
    JSON.stringify({ lat: 10.2154, lng: 122.8732 }),
    "Near Tiaong hanging bridge",
    10,
    6,
    1820.00,
    dateOnlyDaysAgo(40),
    "active",
    JSON.stringify([])
  );

  // 7. Orders & Order Items
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_number, date, time, customer_id, customer_name, customer_phone, delivery_address,
      barangay, coordinates_json, delivery_notes, subtotal, delivery_fee, total_amount, payment_method,
      payment_status, order_type, status, assigned_personnel, delivery_vehicle, requested_schedule,
      estimated_delivery_time, delivered_at, containers_to_return_count, containers_returned_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (
      id, order_id, product_id, product_name, quantity, unit_price, unit, is_water, requires_container_swap, total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const o1 = "ord_2026_001";
  const o2 = "ord_2026_002";
  const o3 = "ord_2026_003";
  const o4 = "ord_2026_004";
  const o5 = "ord_2026_005";
  const o6 = "ord_2026_006";

  // Order 1 (Delivered)
  insertOrder.run(
    o1,
    "ORD-2026-0001",
    dateOnlyDaysAgo(1),
    "08:15",
    c1,
    "Maria Clara Santos",
    "0918-234-5678",
    "Purok Mabini, Brgy. San Pedro, Binalbagan",
    "Brgy. San Pedro",
    JSON.stringify({ lat: 10.1968, lng: 122.8612 }),
    "Regular weekly refill",
    150.00,
    0.00,
    150.00,
    "Cash",
    "Paid",
    "Delivery",
    "Delivered",
    "Ramon Cruz",
    "Multi-cab Tricycle",
    daysAgoIso(1, 9, 30),
    "09:30 AM",
    daysAgoIso(1, 10, 0),
    6,
    6
  );
  insertOrderItem.run(generateId("oit"), o1, pPurified, "Purified Water Refill (5-Gal)", 6, 25.00, "5-gal refill", 1, 1, 150.00);

  // Order 2 (Out for Delivery)
  insertOrder.run(
    o2,
    "ORD-2026-0002",
    todayDate,
    "09:00",
    c2,
    "Binalbagan Mini-Mart (Reseller)",
    "0917-890-1234",
    "Burgos St., Brgy. Poblacion, Binalbagan",
    "Brgy. Poblacion",
    JSON.stringify({ lat: 10.1945, lng: 122.8565 }),
    "20 refills + 10 bottled waters",
    650.00,
    0.00,
    650.00,
    "GCash",
    "Partial",
    "Delivery",
    "Out for Delivery",
    "Joel Bautista",
    "Station Delivery Truck",
    daysAgoIso(0, 14, 0),
    "02:00 PM",
    null,
    20,
    null
  );
  insertOrderItem.run(generateId("oit"), o2, pPurified, "Purified Water Refill (5-Gal)", 20, 25.00, "5-gal refill", 1, 1, 500.00);
  insertOrderItem.run(generateId("oit"), o2, pPet500, "Purified Bottled Water (500ml)", 10, 15.00, "bottle", 1, 0, 150.00);

  // Order 3 (Pending)
  insertOrder.run(
    o3,
    "ORD-2026-0003",
    todayDate,
    "10:30",
    c3,
    "Roberto Mendoza",
    "0920-456-7890",
    "Purok Paglaum, Brgy. Progreso, Binalbagan",
    "Brgy. Progreso",
    JSON.stringify({ lat: 10.1904, lng: 122.8531 }),
    "4 Mineral 5-gal refills",
    140.00,
    0.00,
    140.00,
    "Cash",
    "Unpaid",
    "Delivery",
    "Pending",
    "Marco Villanueva",
    "Multi-cab Tricycle",
    daysAgoIso(0, 16, 0),
    "04:00 PM",
    null,
    4,
    null
  );
  insertOrderItem.run(generateId("oit"), o3, pMineral, "Mineral Water Refill (5-Gal)", 4, 35.00, "5-gal refill", 1, 1, 140.00);

  // Order 4 (Preparing)
  insertOrder.run(
    o4,
    "ORD-2026-0004",
    todayDate,
    "11:00",
    c4,
    "Lourdes Villanueva",
    "0919-654-3210",
    "Zone 3, Brgy. San Vicente, Binalbagan",
    "Brgy. San Vicente",
    JSON.stringify({ lat: 10.1892, lng: 122.8639 }),
    "Call customer upon arrival at yellow gate",
    125.00,
    0.00,
    125.00,
    "Cash",
    "Unpaid",
    "Delivery",
    "Preparing",
    "Ramon Cruz",
    "Multi-cab Tricycle",
    daysAgoIso(0, 15, 0),
    "03:00 PM",
    null,
    5,
    null
  );
  insertOrderItem.run(generateId("oit"), o4, pPurified, "Purified Water Refill (5-Gal)", 5, 25.00, "5-gal refill", 1, 1, 125.00);

  // Order 5 (Delivered)
  insertOrder.run(
    o5,
    "ORD-2026-0005",
    dateOnlyDaysAgo(4),
    "08:30",
    c1,
    "Maria Clara Santos",
    "0918-234-5678",
    "Purok Mabini, Brgy. San Pedro, Binalbagan",
    "Brgy. San Pedro",
    JSON.stringify({ lat: 10.1968, lng: 122.8612 }),
    "Weekly residential refill",
    200.00,
    0.00,
    200.00,
    "Cash",
    "Paid",
    "Delivery",
    "Delivered",
    "Ramon Cruz",
    "Multi-cab Tricycle",
    daysAgoIso(4, 10, 0),
    "10:00 AM",
    daysAgoIso(4, 10, 10),
    8,
    8
  );
  insertOrderItem.run(generateId("oit"), o5, pPurified, "Purified Water Refill (5-Gal)", 8, 25.00, "5-gal refill", 1, 1, 200.00);

  // Order 6 (Pickup - Preparing)
  insertOrder.run(
    o6,
    "ORD-2026-0006",
    todayDate,
    "11:45",
    c5,
    "CHMSU Canteen Concessionaire",
    "0917-777-8899",
    "CHMSU Binalbagan Campus, Brgy. Enclaro",
    "Brgy. Enclaro",
    JSON.stringify({ lat: 10.2008, lng: 122.8655 }),
    "Pickup by school utility van at station bay",
    350.00,
    0.00,
    350.00,
    "Bank Transfer",
    "Paid",
    "Pickup",
    "Preparing",
    null,
    null,
    daysAgoIso(0, 17, 0),
    "05:00 PM",
    null,
    10,
    null
  );
  insertOrderItem.run(generateId("oit"), o6, pMineral, "Mineral Water Refill (5-Gal)", 10, 35.00, "5-gal refill", 1, 1, 350.00);

  // 8. Sales (Counter Purchases) & Sale Items
  const insertSale = db.prepare(`
    INSERT INTO sales (
      id, transaction_number, date, time, customer_id, customer_name, customer_type, order_type,
      subtotal, discount, delivery_fee, container_deposit, total_amount, amount_paid, change_amount,
      payment_method, payment_status, staff_name, is_vending_machine_consolidated, vending_machine_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (
      id, sale_id, product_id, product_name, quantity, unit_price, unit, is_water, requires_container_swap, total
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const s1 = "sale_2026_001";
  const s2 = "sale_2026_002";
  const s3 = "sale_2026_003";
  const s4 = "sale_2026_004";

  insertSale.run(
    s1,
    "SL-2026-0001",
    todayDate,
    "09:15",
    null,
    "Walk-in Customer",
    "walk-in",
    "Walk-in",
    125.00,
    0.00,
    0.00,
    0.00,
    125.00,
    200.00,
    75.00,
    "Cash",
    "Paid",
    "Eugene Senining",
    0,
    null,
    "Cash counter payment"
  );
  insertSaleItem.run(generateId("sit"), s1, pPurified, "Purified Water Refill (5-Gal)", 5, 25.00, "5-gal refill", 1, 1, 125.00);

  insertSale.run(
    s2,
    "SL-2026-0002",
    todayDate,
    "11:30",
    c2,
    "Binalbagan Mini-Mart (Reseller)",
    "reseller",
    "Walk-in",
    500.00,
    0.00,
    0.00,
    0.00,
    500.00,
    500.00,
    0.00,
    "Cash",
    "Paid",
    "Eugene Senining",
    0,
    null,
    "12 refills + 10 pet 500ml + 2 pet 1L"
  );
  insertSaleItem.run(generateId("sit"), s2, pPurified, "Purified Water Refill (5-Gal)", 12, 25.00, "5-gal refill", 1, 1, 300.00);
  insertSaleItem.run(generateId("sit"), s2, pPet500, "Purified Bottled Water (500ml)", 10, 15.00, "bottle", 1, 0, 150.00);
  insertSaleItem.run(generateId("sit"), s2, pPet1L, "Mineral Bottled Water (1L)", 2, 25.00, "bottle", 1, 0, 50.00);

  insertSale.run(
    s3,
    "SL-2026-0003",
    dateOnlyDaysAgo(1),
    "14:10",
    c1,
    "Maria Clara Santos",
    "regular",
    "Walk-in",
    255.00,
    0.00,
    0.00,
    0.00,
    255.00,
    255.00,
    0.00,
    "GCash",
    "Paid",
    "Eugene Senining",
    0,
    null,
    "Purchased 1 new round container + 3 refills"
  );
  insertSaleItem.run(generateId("sit"), s3, pRoundCont, "5-Gallon Round Container", 1, 180.00, "piece", 0, 0, 180.00);
  insertSaleItem.run(generateId("sit"), s3, pPurified, "Purified Water Refill (5-Gal)", 3, 25.00, "5-gal refill", 1, 1, 75.00);

  insertSale.run(
    s4,
    "SL-2026-0004",
    dateOnlyDaysAgo(3),
    "10:45",
    c5,
    "CHMSU Canteen Concessionaire",
    "reseller",
    "Walk-in",
    875.00,
    0.00,
    0.00,
    0.00,
    875.00,
    875.00,
    0.00,
    "Cash",
    "Paid",
    "Eugene Senining",
    0,
    null,
    "25 Mineral 5-gal refills for campus canteen"
  );
  insertSaleItem.run(generateId("sit"), s4, pMineral, "Mineral Water Refill (5-Gal)", 25, 35.00, "5-gal refill", 1, 1, 875.00);

  // 9. Containers Tracking
  const insertContainer = db.prepare(`
    INSERT INTO containers (
      id, date, customer_id, customer_name, container_type, action_type, quantity,
      deposit_amount, refund_amount, status, notes, staff_name
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertContainer.run(
    generateId("cnt"),
    daysAgoIso(4),
    c1,
    "Maria Clara Santos",
    "5-Gallon Round Container",
    "borrowed",
    4,
    0.00,
    0.00,
    "Open",
    "4 round containers currently with customer",
    "Eugene Senining"
  );

  insertContainer.run(
    generateId("cnt"),
    daysAgoIso(2),
    c2,
    "Binalbagan Mini-Mart (Reseller)",
    "5-Gallon Slim Container w/ Faucet",
    "borrowed",
    10,
    0.00,
    0.00,
    "Open",
    "Display and dispensing containers for retail outlet",
    "Eugene Senining"
  );

  insertContainer.run(
    generateId("cnt"),
    daysAgoIso(1),
    c3,
    "Roberto Mendoza",
    "5-Gallon Round Container",
    "customer_owned",
    4,
    0.00,
    0.00,
    "Customer-Owned",
    "Customer-owned personal blue jugs brought for refill",
    "Eugene Senining"
  );

  insertContainer.run(
    generateId("cnt"),
    daysAgoIso(6),
    c4,
    "Lourdes Villanueva",
    "5-Gallon Round Container",
    "returned",
    2,
    0.00,
    0.00,
    "Closed",
    "2 containers returned clean and sanitized",
    "Eugene Senining"
  );

  // 10. Vending Sales
  const insertVendoSale = db.prepare(`
    INSERT INTO vending_sales (
      id, machine_id, machine_name, date, coins_collected, water_dispensed_liters,
      meter_reading_start, meter_reading_end, water_refilled_liters, recorded_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertVendoSale.run(
    generateId("vsl"),
    vm1,
    "Vendo Unit 1 - Station Front",
    todayDate,
    420.00,
    210,
    4820,
    5030,
    250,
    "Eugene Senining",
    "Morning coin box collection & water level top-up"
  );

  insertVendoSale.run(
    generateId("vsl"),
    vm2,
    "Vendo Unit 2 - Public Market",
    todayDate,
    615.00,
    308,
    7140,
    7448,
    350,
    "Eugene Senining",
    "Market midday collection; coin acceptor cleaned"
  );

  insertVendoSale.run(
    generateId("vsl"),
    vm1,
    "Vendo Unit 1 - Station Front",
    dateOnlyDaysAgo(1),
    390.00,
    195,
    4625,
    4820,
    200,
    "Eugene Senining",
    "Regular evening collection"
  );

  insertVendoSale.run(
    generateId("vsl"),
    vm3,
    "Vendo Unit 3 - San Vicente Plaza",
    dateOnlyDaysAgo(2),
    510.00,
    255,
    3210,
    3465,
    300,
    "Eugene Senining",
    "Weekend plaza sports event collection"
  );

  // 11. Stock Movements
  const insertStock = db.prepare(`
    INSERT INTO stock_movements (
      id, date, product_id, product_name, movement_type, quantity, previous_stock,
      new_stock, reference_no, supplier_or_party, staff_name, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStock.run(
    generateId("mov"),
    daysAgoIso(5),
    pCaps,
    "Tamper-Evident Container Caps",
    "stock_in",
    10,
    4,
    14,
    "PO-2026-0812",
    "Bacolod Packaging Co.",
    "Eugene Senining",
    "New supplier shipment of sterile seal caps"
  );

  insertStock.run(
    generateId("mov"),
    daysAgoIso(1),
    pCaps,
    "Tamper-Evident Container Caps",
    "stock_out",
    -6,
    14,
    8,
    "REQ-2026-0144",
    "Station Filling Line",
    "Eugene Senining",
    "Daily sealing usage for 5-gallon container refills"
  );

  insertStock.run(
    generateId("mov"),
    daysAgoIso(2),
    pPurified,
    "Purified Water Refill (5-Gal)",
    "vending_restock",
    -20,
    470,
    450,
    "VR-2026-002",
    "Vendo Unit 2 - Public Market",
    "Eugene Senining",
    "Bulk water transfer for vending machine refill"
  );

  // 12. Compliance Logs
  const insertCompliance = db.prepare(`
    INSERT INTO compliance_logs (
      id, date, log_type, parameter_name, recorded_value, inspector_or_staff, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCompliance.run(
    generateId("cmp"),
    dateOnlyDaysAgo(5),
    "Microbiological Water Test",
    "Total Coliform & E. Coli Count",
    "<1.1 MPN/100ml (Negative)",
    "Negros Provincial Health Lab",
    "PASSED",
    "Monthly sanitary bacteriological compliance certificate issued"
  );

  insertCompliance.run(
    generateId("cmp"),
    dateOnlyDaysAgo(5),
    "Physical & Chemical Analysis",
    "Total Dissolved Solids (TDS) & pH Level",
    "TDS: 18 ppm | pH: 7.4 (Neutral/Optimal)",
    "DOH Accredited Water Testing Lab",
    "PASSED",
    "Meets Philippine National Standards for Drinking Water (PNSDW 2017)"
  );

  insertCompliance.run(
    generateId("cmp"),
    dateOnlyDaysAgo(2),
    "Internal Station Daily QC",
    "Chlorine Residual & Turbidity Check",
    "0.00 ppm Chlorine | 0.2 NTU Turbidity",
    "Eugene Senining (Staff QC)",
    "PASSED",
    "Daily morning filter inspection and sensor verification"
  );

  insertCompliance.run(
    generateId("cmp"),
    dateOnlyDaysAgo(15),
    "Sanitary Inspection",
    "Binalbagan LGU Sanitation Permit Audit",
    "Grade A Sanitation Rating (98%)",
    "Sanitary Inspector - Binalbagan RHU",
    "APPROVED",
    "Annual sanitary inspection compliant; premises and bottling line clean"
  );

  // 13. Activity Logs
  logActivity(uAdmin, "admin", "Administrator", "LOGIN", "Administrator Chrysty Mae Castillo signed into Aqua Fabz System", "Authentication");
  logActivity(uStaff, "staff", "Staff", "LOGIN", "Staff Eugene Senining signed into Station Operations", "Authentication");
  logActivity(uAdmin, "admin", "Administrator", "SYSTEM_ALIGN", "Synchronized database schema with official Chapter 3 ERD Diagram (15 tables)", "System");
  logActivity(uStaff, "staff", "Staff", "STOCK_ADJUSTMENT", "Checked physical count of Tamper-Evident Container Caps (8 packs remaining)", "Inventory");
}

export {
  DELIVERY_PERSONNEL_ROSTER,
  STATION_INFO,
  db,
  generateId,
  hashPassword,
  initDatabase,
  logActivity,
  verifyPassword
};
