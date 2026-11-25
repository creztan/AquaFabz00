import express from "express";
import crypto from "crypto";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  DELIVERY_PERSONNEL_ROSTER,
  STATION_INFO,
  db,
  generateId,
  hashPassword,
  initDatabase,
  logActivity,
  verifyPassword
} from "./server/db.js";

initDatabase();

const app = express();
app.use(express.json({ limit: "2mb" }));

function getAuthUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;
  const row = db.prepare(
    `SELECT u.id, u.name, u.username, u.role, u.phone as contact_number, u.phone, u.email, u.status, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
  ).get(token);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    return null;
  }
  if (row.status !== "active") return null;
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    contact_number: row.contact_number || row.phone || "",
    phone: row.phone || "",
    email: row.email || "",
    status: row.status
  };
}

function requireAuth(req, res, next) {
  const user = getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "Administrator") {
    res.status(403).json({ error: "Administrator permission required." });
    return;
  }
  next();
}

function requireStaff(req, res, next) {
  if (req.user?.role !== "Staff" && req.user?.role !== "Administrator") {
    res.status(403).json({ error: "Staff permissions required." });
    return;
  }
  next();
}

function nextCode(prefix, table, column) {
  const row = db.prepare(`SELECT ${column} FROM ${table} ORDER BY rowid DESC LIMIT 1`).get();
  let num = 1;
  if (row && row[column]) {
    const match = String(row[column]).match(/(\d+)$/);
    if (match) num = Number(match[1]) + 1;
  }
  return `${prefix}-${new Date().getFullYear()}-${String(num).padStart(4, "0")}`;
}

// -------------------------------------------------------------
// Public & Station Info Routes
// -------------------------------------------------------------
function getStationInfo() {
  const setting = db.prepare("SELECT * FROM settings WHERE id = 'set_station_main'").get();
  let coords = { lat: STATION_INFO.lat, lng: STATION_INFO.lng };
  if (setting?.coordinates_json) {
    try {
      const parsed = JSON.parse(setting.coordinates_json);
      if (parsed.lat !== undefined && !Number.isNaN(Number(parsed.lat))) coords.lat = Number(parsed.lat);
      if (parsed.lng !== undefined && !Number.isNaN(Number(parsed.lng))) coords.lng = Number(parsed.lng);
    } catch {}
  }
  return {
    ...STATION_INFO,
    ...(setting || {}),
    name: setting?.station_name || STATION_INFO.name,
    address: setting?.address || STATION_INFO.address,
    contact: setting?.contact_number || STATION_INFO.contact,
    lat: coords.lat,
    lng: coords.lng
  };
}

app.get("/api/station", (_req, res) => {
  res.json({
    station: getStationInfo(),
    deliveryPersonnel: DELIVERY_PERSONNEL_ROSTER
  });
});

app.put("/api/station", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const current = getStationInfo();
  const stationName = String(req.body?.name ?? req.body?.station_name ?? current.name).trim();
  const address = String(req.body?.address ?? current.address).trim();
  const barangay = String(req.body?.barangay ?? current.barangay ?? "Brgy. Poblacion").trim();
  const city = String(req.body?.city ?? current.city ?? "Binalbagan").trim();
  const province = String(req.body?.province ?? current.province ?? "Negros Occidental").trim();
  const contactNumber = String(req.body?.contact ?? req.body?.contact_number ?? current.contact).trim();
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);

  if (!stationName || !address) {
    return res.status(400).json({ error: "Station name and address are required." });
  }
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "Valid latitude and longitude coordinates are required." });
  }

  const coordsJson = JSON.stringify({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
  db.prepare(`
    UPDATE settings
    SET station_name = ?, address = ?, barangay = ?, city = ?, province = ?, contact_number = ?, coordinates_json = ?
    WHERE id = 'set_station_main'
  `).run(stationName, address, barangay, city, province, contactNumber, coordsJson);

  logActivity(
    admin.id,
    admin.username,
    admin.role,
    "STATION_UPDATE",
    `Updated station location to ${address} (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
    "Settings"
  );
  res.json({ station: getStationInfo() });
});

app.get("/api/settings", requireAuth, (_req, res) => {
  const setting = db.prepare("SELECT * FROM settings WHERE id = 'set_station_main'").get();
  res.json({ setting: setting || STATION_INFO });
});

app.get("/api/compliance-logs", requireAuth, (_req, res) => {
  const logs = db.prepare("SELECT * FROM compliance_logs ORDER BY date DESC, id DESC").all();
  res.json({ logs });
});

app.post("/api/compliance-logs", requireAuth, requireStaff, (req, res) => {
  const { date, log_type, parameter_name, recorded_value, inspector_or_staff, status, notes } = req.body;
  if (!log_type || !parameter_name || !recorded_value) {
    res.status(400).json({ error: "Log type, parameter name, and recorded value are required." });
    return;
  }
  const id = generateId("cmp");
  const logDate = date || new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO compliance_logs (id, date, log_type, parameter_name, recorded_value, inspector_or_staff, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    logDate,
    log_type,
    parameter_name,
    recorded_value,
    inspector_or_staff || req.user.name,
    status || "PASSED",
    notes || ""
  );
  logActivity(req.user.id, req.user.username, req.user.role, "COMPLIANCE_LOG", `Recorded ${log_type}: ${parameter_name}`);
  const log = db.prepare("SELECT * FROM compliance_logs WHERE id = ?").get(id);
  res.status(201).json({ log });
});

function getInactiveProductIds() {
  try {
    const row = db.prepare("SELECT meta_value FROM app_meta WHERE meta_key = 'inactive_product_ids'").get();
    if (!row || !row.meta_value) return new Set();
    const arr = JSON.parse(row.meta_value);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function setInactiveProductIds(idSet) {
  db.prepare(`
    INSERT INTO app_meta (meta_key, meta_value)
    VALUES ('inactive_product_ids', ?)
    ON CONFLICT(meta_key) DO UPDATE SET meta_value = excluded.meta_value
  `).run(JSON.stringify(Array.from(idSet)));
}

app.get("/api/public/overview", (_req, res) => {
  const inactiveIds = getInactiveProductIds();
  const products = db.prepare(
    "SELECT id, code, name, category, unit, price, stock, min_stock, stock as stock_qty, min_stock as min_stock_level, is_water, description FROM products ORDER BY category ASC, name ASC"
  ).all().filter((p) => !inactiveIds.has(p.id));

  const machines = db.prepare(
    "SELECT id, code, name, location_name, barangay, coordinates_json, status, current_water_level_liters FROM vending_machines WHERE status != 'out_of_service' ORDER BY code ASC, id ASC"
  ).all();

  const vendingMachines = machines.map((m) => {
    let lat = 10.1935;
    let lng = 122.8586;
    try {
      const parsed = JSON.parse(m.coordinates_json || "{}");
      lat = parsed.lat || lat;
      lng = parsed.lng || lng;
    } catch {}
    return { ...m, lat, lng };
  });

  const areaRows = db.prepare(
    "SELECT DISTINCT barangay FROM customers WHERE TRIM(barangay) != '' ORDER BY barangay ASC"
  ).all();

  res.json({
    station: getStationInfo(),
    products,
    vendingMachines,
    serviceAreas: areaRows.map((r) => r.barangay)
  });
});

app.get("/api/public/delivery-reference", (req, res) => {
  const personnel = String(req.query.personnel || "").trim();
  const status = String(req.query.status || "").trim();

  let query = "SELECT o.* FROM orders o WHERE o.order_type = 'Delivery'";
  const params = [];
  if (personnel && personnel !== "All") {
    query += " AND o.assigned_personnel = ?";
    params.push(personnel);
  }
  if (status && status !== "All") {
    query += " AND o.status = ?";
    params.push(status);
  }
  query += " ORDER BY o.date DESC, o.time DESC";

  const orders = db.prepare(query).all(...params);
  const getItems = db.prepare("SELECT *, total as line_total FROM order_items WHERE order_id = ?");

  const deliveries = orders.map((o) => {
    let lat = 10.1935;
    let lng = 122.8586;
    try {
      const parsed = JSON.parse(o.coordinates_json || "{}");
      lat = parsed.lat || lat;
      lng = parsed.lng || lng;
    } catch {}
    const items = getItems.all(o.id);
    return {
      id: o.id,
      delivery_no: `DEL-${o.order_number.replace(/^ORD-/, "")}`,
      order_id: o.id,
      order_no: o.order_number,
      customer_id: o.customer_id,
      customer_name: o.customer_name,
      customer_contact: o.customer_phone,
      order_total: o.total_amount,
      amount_paid: o.payment_status === "Paid" ? o.total_amount : o.payment_status === "Partial" ? o.total_amount / 2 : 0,
      payment_status: o.payment_status,
      assigned_personnel: o.assigned_personnel || "Unassigned",
      delivery_vehicle: o.delivery_vehicle || "Tricycle",
      scheduled_datetime: o.requested_schedule,
      status: o.status,
      address: o.delivery_address,
      barangay: o.barangay,
      lat,
      lng,
      notes: o.delivery_notes,
      share_token: o.id,
      delivered_at: o.delivered_at,
      items
    };
  });

  res.json({
    station: getStationInfo(),
    personnelRoster: DELIVERY_PERSONNEL_ROSTER,
    deliveries
  });
});

app.get("/api/public/delivery-reference/:token", (req, res) => {
  const token = req.params.token;
  const o = db.prepare("SELECT * FROM orders WHERE id = ? OR order_number = ?").get(token, token);
  if (!o) {
    res.status(404).json({ error: "Delivery reference not found." });
    return;
  }
  const items = db.prepare("SELECT *, total as line_total FROM order_items WHERE order_id = ?").all(o.id);
  let lat = 10.1935;
  let lng = 122.8586;
  try {
    const parsed = JSON.parse(o.coordinates_json || "{}");
    lat = parsed.lat || lat;
    lng = parsed.lng || lng;
  } catch {}
  res.json({
    station: getStationInfo(),
    delivery: {
      id: o.id,
      delivery_no: `DEL-${o.order_number.replace(/^ORD-/, "")}`,
      order_id: o.id,
      order_no: o.order_number,
      customer_name: o.customer_name,
      customer_contact: o.customer_phone,
      order_total: o.total_amount,
      amount_paid: o.payment_status === "Paid" ? o.total_amount : o.payment_status === "Partial" ? o.total_amount / 2 : 0,
      payment_status: o.payment_status,
      assigned_personnel: o.assigned_personnel || "Unassigned",
      delivery_vehicle: o.delivery_vehicle || "Tricycle",
      scheduled_datetime: o.requested_schedule,
      status: o.status,
      address: o.delivery_address,
      barangay: o.barangay,
      lat,
      lng,
      notes: o.delivery_notes,
      delivered_at: o.delivered_at,
      items
    }
  });
});

// -------------------------------------------------------------
// Auth & User Management Routes
// -------------------------------------------------------------
app.post("/api/auth/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!username || !password) {
    res.status(400).json({ error: "Please enter both username and password." });
    return;
  }
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) {
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }
  if (user.status !== "active") {
    res.status(403).json({ error: "Your account has been deactivated. Please contact the Administrator." });
    return;
  }
  if (!verifyPassword(password, user.password_hash)) {
    logActivity(user.id, user.username, user.role, "LOGIN_FAILED", "Failed login attempt", "Authentication");
    res.status(401).json({ error: "Invalid username or password." });
    return;
  }
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString();
  db.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    token,
    user.id,
    now.toISOString(),
    expiresAt
  );
  db.prepare("UPDATE users SET last_login = ? WHERE id = ?").run(now.toISOString(), user.id);
  logActivity(user.id, user.username, user.role, "LOGIN", `${user.role} ${user.name} logged in`, "Authentication");
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      contact_number: user.phone || "",
      phone: user.phone || "",
      email: user.email || "",
      status: user.status
    }
  });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  }
  res.json({ ok: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.put("/api/account/profile", requireAuth, (req, res) => {
  const user = req.user;
  const name = String(req.body?.name || "").trim();
  const contact_number = String(req.body?.contact_number || req.body?.phone || "").trim();
  const email = String(req.body?.email || "").trim();
  if (!name) {
    res.status(400).json({ error: "Name is required." });
    return;
  }
  db.prepare("UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?").run(name, contact_number, email, user.id);
  logActivity(user.id, user.username, user.role, "PROFILE_UPDATE", `Updated account details for ${name}`, "User");
  res.json({
    user: {
      ...user,
      name,
      contact_number,
      phone: contact_number,
      email
    }
  });
});

app.put("/api/account/password", requireAuth, (req, res) => {
  const user = req.user;
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Both current and new passwords are required." });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters." });
    return;
  }
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id);
  if (!verifyPassword(currentPassword, row.password_hash)) {
    res.status(400).json({ error: "Current password is incorrect." });
    return;
  }
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), user.id);
  logActivity(user.id, user.username, user.role, "PASSWORD_CHANGE", `Changed account password for ${user.username}`, "Authentication");
  res.json({ ok: true, message: "Password updated successfully." });
});

app.get("/api/staff", requireAuth, requireAdmin, (_req, res) => {
  const rows = db.prepare(
    "SELECT id, name, username, role, phone as contact_number, phone, email, status, last_login as created_at FROM users ORDER BY role ASC, name ASC"
  ).all();
  res.json({ accounts: rows });
});

app.post("/api/staff", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const name = String(req.body?.name || "").trim();
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const contact_number = String(req.body?.contact_number || req.body?.phone || "").trim();
  const email = String(req.body?.email || "").trim();
  if (!name || !username || !password) {
    res.status(400).json({ error: "Name, username, and temporary password are required." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Temporary password must be at least 6 characters." });
    return;
  }
  const existing = db.prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)").get(username);
  if (existing) {
    res.status(409).json({ error: `Username "${username}" is already in use.` });
    return;
  }
  const id = generateId("usr");
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, customer_id, name, username, password_hash, role, email, phone, status, avatar, last_login)
    VALUES (?, NULL, ?, ?, ?, 'Staff', ?, ?, 'active', NULL, ?)
  `).run(id, name, username, hashPassword(password), email, contact_number, now);
  logActivity(admin.id, admin.username, admin.role, "STAFF_CREATE", `Created Staff account for ${name} (${username})`, "User");
  const created = db.prepare("SELECT id, name, username, role, phone as contact_number, status, last_login as created_at FROM users WHERE id = ?").get(id);
  res.status(201).json({ account: created });
});

app.put("/api/staff/:id", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const id = String(req.params.id);
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!target) {
    res.status(404).json({ error: "Staff account not found." });
    return;
  }
  if (target.role !== "Staff") {
    res.status(400).json({ error: "Only Staff accounts can be modified here." });
    return;
  }
  const name = String(req.body?.name || target.name).trim();
  const contact_number = String(req.body?.contact_number ?? target.phone ?? "").trim();
  const newPassword = req.body?.password ? String(req.body.password) : "";
  if (!name) {
    res.status(400).json({ error: "Staff name cannot be empty." });
    return;
  }
  db.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").run(name, contact_number, id);
  if (newPassword) {
    if (newPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(newPassword), id);
  }
  logActivity(admin.id, admin.username, admin.role, "STAFF_UPDATE", `Updated Staff account ${target.username} (${name})`, "User");
  const updated = db.prepare("SELECT id, name, username, role, phone as contact_number, status FROM users WHERE id = ?").get(id);
  res.json({ account: updated });
});

app.patch("/api/staff/:id/status", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const id = String(req.params.id);
  const status = req.body?.status === "inactive" ? "inactive" : "active";
  const target = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!target) {
    res.status(404).json({ error: "Account not found." });
    return;
  }
  if (target.role !== "Staff") {
    res.status(400).json({ error: "Cannot deactivate Administrator account." });
    return;
  }
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
  if (status === "inactive") {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(id);
  }
  logActivity(admin.id, admin.username, admin.role, "STAFF_DEACTIVATE", `${status === "inactive" ? "Deactivated" : "Reactivated"} Staff account ${target.username}`, "User");
  res.json({ ok: true, status });
});

// -------------------------------------------------------------
// Products & Inventory Routes
// -------------------------------------------------------------
app.get("/api/products", requireAuth, (_req, res) => {
  const inactiveIds = getInactiveProductIds();
  const rows = db.prepare("SELECT *, stock as stock_qty, min_stock as min_stock_level, is_water as is_container_water FROM products ORDER BY category ASC, name ASC").all();
  const products = rows.map((p) => ({
    ...p,
    stock_qty: p.stock,
    min_stock_level: p.min_stock,
    is_container: p.category === "Water Container" ? 1 : 0,
    status: inactiveIds.has(p.id) ? "inactive" : "active"
  }));
  const machines = db.prepare("SELECT *, current_water_level_liters as stock_qty, 50 as min_stock_level FROM vending_machines WHERE status != 'out_of_service' ORDER BY code ASC, id ASC").all();
  const vendingMachines = machines.map((m) => {
    let lat = 10.1935;
    let lng = 122.8586;
    try {
      const parsed = JSON.parse(m.coordinates_json || "{}");
      lat = parsed.lat || lat;
      lng = parsed.lng || lng;
    } catch {}
    return { ...m, lat, lng, stock_qty: m.current_water_level_liters, min_stock_level: 50 };
  });
  res.json({ products, vendingMachines });
});

app.post("/api/products", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const name = String(req.body?.name || "").trim();
  const category = String(req.body?.category || "").trim();
  const unit = String(req.body?.unit || "").trim();
  const price = Number(req.body?.price);
  const cost = Number(req.body?.cost ?? 0);
  const stock = Number(req.body?.stock_qty ?? req.body?.stock ?? 0);
  const min_stock = Number(req.body?.min_stock_level ?? req.body?.min_stock ?? 10);
  const is_water = req.body?.is_water ? 1 : category.includes("Water") ? 1 : 0;
  const description = String(req.body?.description || name).trim();
  const requires_container_swap = req.body?.requires_container_swap ? 1 : 0;

  if (!name || !category || !unit || Number.isNaN(price) || price <= 0) {
    res.status(400).json({ error: "Product name, category, unit, and valid price are required." });
    return;
  }
  const dup = db.prepare("SELECT id FROM products WHERE LOWER(name) = LOWER(?)").get(name);
  if (dup) {
    res.status(409).json({ error: `Product "${name}" already exists.` });
    return;
  }
  const id = generateId("prd");
  const code = nextCode("PRD", "products", "code");
  db.prepare(`
    INSERT INTO products (id, code, name, category, price, cost, stock, min_stock, unit, is_water, description, requires_container_swap)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, code, name, category, price, cost, stock, min_stock, unit, is_water, description, requires_container_swap);

  logActivity(admin.id, admin.username, admin.role, "PRODUCT_CREATE", `Added product "${name}" (₱${price.toFixed(2)})`, "Inventory");
  const product = db.prepare("SELECT *, stock as stock_qty, min_stock as min_stock_level FROM products WHERE id = ?").get(id);
  res.status(201).json({ product: { ...product, stock_qty: product.stock, min_stock_level: product.min_stock } });
});

app.put("/api/products/:id", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const id = String(req.params.id);
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const name = String(req.body?.name || existing.name).trim();
  const category = String(req.body?.category || existing.category).trim();
  const unit = String(req.body?.unit || existing.unit).trim();
  const price = Number(req.body?.price ?? existing.price);
  const cost = Number(req.body?.cost ?? existing.cost);
  const min_stock = Number(req.body?.min_stock_level ?? req.body?.min_stock ?? existing.min_stock);
  const description = String(req.body?.description ?? existing.description).trim();

  db.prepare(`
    UPDATE products SET name = ?, category = ?, unit = ?, price = ?, cost = ?, min_stock = ?, description = ?
    WHERE id = ?
  `).run(name, category, unit, price, cost, min_stock, description, id);

  if (existing.price !== price) {
    logActivity(admin.id, admin.username, admin.role, "PRICE_CHANGE", `Changed price of "${name}" from ₱${existing.price.toFixed(2)} to ₱${price.toFixed(2)}`, "Inventory");
  }
  const product = db.prepare("SELECT *, stock as stock_qty, min_stock as min_stock_level FROM products WHERE id = ?").get(id);
  const inactiveIds = getInactiveProductIds();
  res.json({
    product: {
      ...product,
      stock_qty: product.stock,
      min_stock_level: product.min_stock,
      status: inactiveIds.has(product.id) ? "inactive" : "active"
    }
  });
});

app.patch("/api/products/:id/status", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const id = String(req.params.id);
  const nextStatus = req.body?.status === "inactive" ? "inactive" : "active";
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  const inactiveIds = getInactiveProductIds();
  if (nextStatus === "inactive") {
    inactiveIds.add(id);
  } else {
    inactiveIds.delete(id);
  }
  setInactiveProductIds(inactiveIds);
  logActivity(admin.id, admin.username, admin.role, "PRODUCT_STATUS", `Marked product "${existing.name}" as ${nextStatus}`, "Inventory");
  res.json({ ok: true, status: nextStatus });
});

app.get("/api/stock-movements", requireAuth, (_req, res) => {
  const movements = db.prepare(`
    SELECT sm.*,
      p.name as product_name,
      sm.date as movement_date,
      sm.date as created_at,
      sm.quantity as quantity_change,
      sm.new_stock as new_qty,
      sm.notes as reason,
      vm.name as vending_machine_name
    FROM stock_movements sm
    LEFT JOIN products p ON p.id = sm.product_id
    LEFT JOIN vending_machines vm ON vm.id = sm.supplier_or_party
    ORDER BY sm.date DESC, sm.id DESC LIMIT 150
  `).all();
  res.json({ movements });
});

app.post("/api/inventory/move", requireAuth, requireStaff, (req, res) => {
  const staff = req.user;
  const product_id = String(req.body?.product_id);
  const movement_type = String(req.body?.movement_type || "");
  const quantity = Number(req.body?.quantity);
  const vending_machine_id = req.body?.vending_machine_id ? String(req.body.vending_machine_id) : null;
  const reason = String(req.body?.reason || "").trim();
  const movement_date = String(req.body?.movement_date || new Date().toISOString().slice(0, 10));

  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(product_id);
  if (!product) {
    res.status(404).json({ error: "Product not found." });
    return;
  }
  if (!["stock_in", "stock_out", "adjustment", "vending_restock"].includes(movement_type)) {
    res.status(400).json({ error: "Invalid stock movement type." });
    return;
  }
  let newQty = product.stock;
  let qtyChange = 0;
  if (movement_type === "stock_in") {
    if (quantity <= 0) return res.status(400).json({ error: "Quantity must be > 0." });
    qtyChange = quantity;
    newQty = product.stock + quantity;
  } else if (movement_type === "stock_out" || movement_type === "vending_restock") {
    if (quantity <= 0 || quantity > product.stock) {
      return res.status(400).json({ error: `Cannot deduct ${quantity}; stock is ${product.stock}.` });
    }
    qtyChange = -quantity;
    newQty = product.stock - quantity;
  } else if (movement_type === "adjustment") {
    newQty = quantity;
    qtyChange = newQty - product.stock;
  }

  if (movement_type === "vending_restock") {
    if (!vending_machine_id) return res.status(400).json({ error: "Select a vending machine to restock." });
    const vm = db.prepare("SELECT * FROM vending_machines WHERE id = ?").get(vending_machine_id);
    if (!vm) return res.status(404).json({ error: "Vending machine not found." });
    if (vm.status === "out_of_service") {
      return res.status(400).json({ error: "This vending machine is Out of Service and cannot be restocked." });
    }
  }

  const movId = generateId("mov");
  db.transaction(() => {
    db.prepare("UPDATE products SET stock = ? WHERE id = ?").run(newQty, product.id);
    if (movement_type === "vending_restock" && vending_machine_id) {
      db.prepare("UPDATE vending_machines SET current_water_level_liters = current_water_level_liters + ?, last_serviced = ? WHERE id = ?").run(
        quantity * 19,
        new Date().toISOString().slice(0, 10),
        vending_machine_id
      );
    }
    db.prepare(`
      INSERT INTO stock_movements (id, date, product_id, product_name, movement_type, quantity, previous_stock, new_stock, reference_no, supplier_or_party, staff_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      movId,
      new Date().toISOString(),
      product.id,
      product.name,
      movement_type,
      qtyChange,
      product.stock,
      newQty,
      `MOV-${Date.now()}`,
      vending_machine_id || "Main Station",
      staff.name,
      reason || "Stock adjustment"
    );
    logActivity(staff.id, staff.username, staff.role, "STOCK_ADJUSTMENT", `Updated stock for "${product.name}" from ${product.stock} to ${newQty}`, "Inventory");
  })();

  const updatedProduct = db.prepare("SELECT *, stock as stock_qty, min_stock as min_stock_level FROM products WHERE id = ?").get(product.id);
  res.json({ ok: true, product: { ...updatedProduct, stock_qty: updatedProduct.stock, min_stock_level: updatedProduct.min_stock } });
});

// -------------------------------------------------------------
// Customers & Location Mapping Routes (ERD JSON fields)
// -------------------------------------------------------------
function extractLocations(customer) {
  let primaryCoords = { lat: 10.1935, lng: 122.8586 };
  try {
    primaryCoords = JSON.parse(customer.coordinates_json || "{}");
    if (!primaryCoords.lat) primaryCoords = { lat: 10.1935, lng: 122.8586 };
  } catch {}

  const locs = [
    {
      id: `loc_${customer.id}_primary`,
      label: "Primary Residence",
      address: customer.primary_address,
      barangay: customer.barangay || "Brgy. Poblacion",
      landmark_notes: customer.delivery_notes || "",
      lat: primaryCoords.lat,
      lng: primaryCoords.lng,
      is_primary: 1
    }
  ];

  if (customer.additional_locations_json) {
    try {
      const extra = JSON.parse(customer.additional_locations_json);
      if (Array.isArray(extra)) {
        extra.forEach((e, idx) => {
          locs.push({
            id: e.id || `loc_${customer.id}_extra_${idx}`,
            label: e.label || `Location ${idx + 2}`,
            address: e.address || customer.primary_address,
            barangay: e.barangay || customer.barangay,
            landmark_notes: e.landmark_notes || "",
            lat: Number(e.lat || primaryCoords.lat),
            lng: Number(e.lng || primaryCoords.lng),
            is_primary: 0
          });
        });
      }
    } catch {}
  }
  return locs;
}

app.get("/api/customers", requireAuth, (req, res) => {
  const search = String(req.query.q || "").trim().toLowerCase();
  const type = String(req.query.type || "").trim();

  let sql = "SELECT * FROM customers WHERE 1=1";
  const params = [];
  if (type && type !== "all") {
    sql += " AND customer_type = ?";
    params.push(type);
  }
  if (search) {
    sql += " AND (LOWER(name) LIKE ? OR LOWER(contact_number) LIKE ? OR LOWER(primary_address) LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  sql += " ORDER BY registered_date DESC, id DESC";

  const rows = db.prepare(sql).all(...params);
  const enriched = rows.map((c) => {
    const locations = extractLocations(c);
    const openOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ? AND status NOT IN ('Delivered', 'Completed', 'Cancelled')").get(c.id).cnt;
    const containersHeld = db.prepare("SELECT COALESCE(SUM(quantity), 0) as cnt FROM containers WHERE customer_id = ? AND action_type = 'borrowed' AND status = 'Open'").get(c.id).cnt;
    return {
      ...c,
      address: c.primary_address,
      locations,
      open_orders_count: openOrders,
      unreturned_containers: containersHeld || c.containers_held || 0
    };
  });

  res.json({ customers: enriched });
});

app.post("/api/customers", requireAuth, requireStaff, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const contact_number = String(req.body?.contact_number || "").trim();
  const address = String(req.body?.address || req.body?.primary_address || "").trim();
  const customer_type = String(req.body?.customer_type || "regular");
  const forceCreate = Boolean(req.body?.forceCreate);

  if (!name || !contact_number || !address) {
    res.status(400).json({ error: "Name, contact number, and address are required." });
    return;
  }
  if (!forceCreate) {
    const similar = db.prepare(
      "SELECT id, name, contact_number FROM customers WHERE LOWER(name) = LOWER(?) OR contact_number = ?"
    ).get(name, contact_number);
    if (similar) {
      res.status(409).json({
        error: `A similar customer profile already exists: ${similar.name} (${similar.contact_number}).`,
        existingCustomer: similar
      });
      return;
    }
  }

  const id = generateId("cust");
  const today = new Date().toISOString().slice(0, 10);
  let coords = { lat: 10.1968, lng: 122.8612 };
  let additionalLocs = [];

  if (Array.isArray(req.body?.locations) && req.body.locations.length > 0) {
    const primary = req.body.locations[0];
    coords = { lat: Number(primary.lat || 10.1968), lng: Number(primary.lng || 122.8612) };
    additionalLocs = req.body.locations.slice(1);
  }

  db.prepare(`
    INSERT INTO customers (
      id, name, contact_number, email, customer_type, primary_address, barangay, city,
      coordinates_json, delivery_notes, containers_held, total_orders, total_spent,
      registered_date, status, additional_locations_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0.00, ?, 'active', ?)
  `).run(
    id,
    name,
    contact_number,
    req.body?.email || null,
    customer_type,
    address,
    req.body?.barangay || "Brgy. Poblacion",
    "Binalbagan",
    JSON.stringify(coords),
    req.body?.notes || req.body?.delivery_notes || "",
    today,
    JSON.stringify(additionalLocs)
  );

  logActivity(req.user.id, req.user.username, req.user.role, "CUSTOMER_CREATE", `Registered customer ${name}`, "Customer");
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  res.status(201).json({ customer: { ...customer, address: customer.primary_address, locations: extractLocations(customer) } });
});

app.put("/api/customers/:id", requireAuth, requireStaff, (req, res) => {
  const id = String(req.params.id);
  const target = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  if (!target) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  const name = String(req.body?.name || target.name).trim();
  const contact_number = String(req.body?.contact_number || target.contact_number).trim();
  const address = String(req.body?.address || req.body?.primary_address || target.primary_address).trim();
  const customer_type = String(req.body?.customer_type || target.customer_type);

  db.prepare(`
    UPDATE customers SET name = ?, contact_number = ?, primary_address = ?, customer_type = ?
    WHERE id = ?
  `).run(name, contact_number, address, customer_type, id);

  logActivity(req.user.id, req.user.username, req.user.role, "CUSTOMER_UPDATE", `Updated customer ${name}`, "Customer");
  const updated = db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  res.json({ customer: { ...updated, address: updated.primary_address, locations: extractLocations(updated) } });
});

app.post("/api/customers/:id/locations", requireAuth, requireStaff, (req, res) => {
  const cid = String(req.params.id);
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(cid);
  if (!customer) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  const label = String(req.body?.label || "Branch Location").trim();
  const address = String(req.body?.address || customer.primary_address).trim();
  const barangay = String(req.body?.barangay || customer.barangay).trim();
  const landmark_notes = String(req.body?.landmark_notes || "").trim();
  const lat = Number(req.body?.lat || 10.1935);
  const lng = Number(req.body?.lng || 122.8586);
  const is_primary = Boolean(req.body?.is_primary);

  const newLoc = {
    id: `loc_${cid}_${Date.now()}`,
    label,
    address,
    barangay,
    landmark_notes,
    lat,
    lng,
    is_primary: is_primary ? 1 : 0
  };

  if (is_primary) {
    db.prepare(`
      UPDATE customers SET primary_address = ?, barangay = ?, coordinates_json = ?, delivery_notes = ?
      WHERE id = ?
    `).run(address, barangay, JSON.stringify({ lat, lng }), landmark_notes, cid);
  } else {
    let extra = [];
    try {
      extra = JSON.parse(customer.additional_locations_json || "[]");
    } catch {}
    extra.push(newLoc);
    db.prepare("UPDATE customers SET additional_locations_json = ? WHERE id = ?").run(JSON.stringify(extra), cid);
  }

  logActivity(req.user.id, req.user.username, req.user.role, "LOCATION_PIN", `Saved delivery pin "${label}" for ${customer.name}`, "Location");
  res.status(201).json({ location: newLoc });
});

app.put("/api/locations/:id", requireAuth, requireStaff, (req, res) => {
  const locId = String(req.params.id);
  const label = String(req.body?.label || "").trim();
  const address = String(req.body?.address || "").trim();
  const barangay = String(req.body?.barangay || "").trim();
  const landmark_notes = String(req.body?.landmark_notes || "").trim();
  const lat = Number(req.body?.lat || 10.1935);
  const lng = Number(req.body?.lng || 122.8586);
  const is_primary = Boolean(req.body?.is_primary);

  const customers = db.prepare("SELECT * FROM customers").all();
  for (const c of customers) {
    if (locId === `loc_${c.id}_primary`) {
      db.prepare(`
        UPDATE customers SET
          primary_address = COALESCE(NULLIF(?, ''), primary_address),
          barangay = COALESCE(NULLIF(?, ''), barangay),
          coordinates_json = ?,
          delivery_notes = ?
        WHERE id = ?
      `).run(address, barangay, JSON.stringify({ lat, lng }), landmark_notes, c.id);
      logActivity(req.user.id, req.user.username, req.user.role, "LOCATION_UPDATE", `Updated primary pin for ${c.name}`, "Location");
      return res.json({ ok: true });
    }
    try {
      const list = JSON.parse(c.additional_locations_json || "[]");
      const idx = list.findIndex((l, i) => (l.id || `loc_${c.id}_extra_${i}`) === locId);
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          id: locId,
          label: label || list[idx].label,
          address: address || list[idx].address,
          barangay: barangay || list[idx].barangay,
          landmark_notes,
          lat,
          lng,
          is_primary: is_primary ? 1 : 0
        };
        db.prepare("UPDATE customers SET additional_locations_json = ? WHERE id = ?").run(JSON.stringify(list), c.id);
        logActivity(req.user.id, req.user.username, req.user.role, "LOCATION_UPDATE", `Updated delivery pin "${list[idx].label}" for ${c.name}`, "Location");
        return res.json({ ok: true });
      }
    } catch {}
  }
  res.status(404).json({ error: "Location not found." });
});

app.delete("/api/locations/:id", requireAuth, requireStaff, (req, res) => {
  const locId = String(req.params.id);
  // Find customer with this location in additional_locations_json
  const customers = db.prepare("SELECT id, additional_locations_json FROM customers").all();
  for (const c of customers) {
    try {
      const list = JSON.parse(c.additional_locations_json || "[]");
      const filtered = list.filter((l) => l.id !== locId);
      if (filtered.length !== list.length) {
        db.prepare("UPDATE customers SET additional_locations_json = ? WHERE id = ?").run(JSON.stringify(filtered), c.id);
        return res.json({ ok: true });
      }
    } catch {}
  }
  res.json({ ok: true });
});

app.get("/api/customers/:id/history", requireAuth, (req, res) => {
  const cid = String(req.params.id);
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(cid);
  if (!customer) {
    res.status(404).json({ error: "Customer not found." });
    return;
  }
  const sales = db.prepare("SELECT *, transaction_number as receipt_no, staff_name as recorded_by_name FROM sales WHERE customer_id = ? ORDER BY date DESC, time DESC").all(cid);
  const getSaleItems = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?");
  const enrichedSales = sales.map((s) => ({ ...s, items: getSaleItems.all(s.id) }));

  const orders = db.prepare("SELECT *, order_number as order_no FROM orders WHERE customer_id = ? ORDER BY date DESC, time DESC").all(cid);
  const getOrderItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?");
  const enrichedOrders = orders.map((o) => ({ ...o, items: getOrderItems.all(o.id) }));

  const payments = orders.filter((o) => o.payment_status === "Paid" || o.payment_status === "Partial").map((o, idx) => ({
    id: `pay_${o.id}`,
    payment_no: `PAY-2026-${String(idx + 1).padStart(4, "0")}`,
    order_id: o.id,
    order_no: o.order_number,
    customer_id: o.customer_id,
    amount: o.payment_status === "Paid" ? o.total_amount : o.total_amount / 2,
    method: o.payment_method,
    reference_note: "Recorded payment",
    created_at: `${o.date} ${o.time}`
  }));

  const deliveries = orders.filter((o) => o.order_type === "Delivery").map((o) => ({
    id: o.id,
    delivery_no: `DEL-${o.order_number.replace(/^ORD-/, "")}`,
    order_no: o.order_number,
    address: o.delivery_address,
    status: o.status,
    assigned_personnel: o.assigned_personnel,
    created_at: `${o.date} ${o.time}`
  }));

  const containers = db.prepare("SELECT * FROM containers WHERE customer_id = ? ORDER BY date DESC").all(cid);

  res.json({
    customer: { ...customer, address: customer.primary_address, locations: extractLocations(customer) },
    sales: enrichedSales,
    orders: enrichedOrders,
    payments,
    deliveries,
    containers
  });
});

// -------------------------------------------------------------
// Sales (POS) Routes (ERD: sales & sale_items)
// -------------------------------------------------------------
app.get("/api/sales", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT *, transaction_number as receipt_no, staff_name as recorded_by_name FROM sales ORDER BY date DESC, time DESC, id DESC").all();
  const getItems = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?");
  const sales = rows.map((s) => ({
    ...s,
    created_at: `${s.date} ${s.time}`,
    status: s.payment_status === "Voided" ? "voided" : "completed",
    print_count: 0,
    items: getItems.all(s.id)
  }));
  res.json({ sales });
});

app.post("/api/sales", requireAuth, requireStaff, (req, res) => {
  const staff = req.user;
  const customer_id = req.body?.customer_id ? String(req.body.customer_id) : null;
  const payment_method = String(req.body?.payment_method || "Cash");
  const itemsInput = Array.isArray(req.body?.items) ? req.body.items : [];

  if (itemsInput.length === 0) {
    res.status(400).json({ error: "Add at least one item to record a sale." });
    return;
  }
  let customer_name = "Walk-in Customer";
  let customer_type = "walk-in";
  if (customer_id) {
    const cust = db.prepare("SELECT name, customer_type FROM customers WHERE id = ?").get(customer_id);
    if (cust) {
      customer_name = cust.name;
      customer_type = cust.customer_type;
    }
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16);
  const saleId = generateId("sale");
  const txNumber = nextCode("SL", "sales", "transaction_number");

  try {
    db.transaction(() => {
      let subtotal = 0;
      const prepared = [];

      for (const item of itemsInput) {
        const prod = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
        if (!prod) throw new Error("Selected product not found.");
        const qty = Number(item.quantity);
        if (qty <= 0 || qty > prod.stock) {
          throw new Error(`Insufficient stock for "${prod.name}" (Available: ${prod.stock}).`);
        }
        const lineTotal = prod.price * qty;
        subtotal += lineTotal;
        prepared.push({ prod, qty, lineTotal });
      }

      db.prepare(`
        INSERT INTO sales (
          id, transaction_number, date, time, customer_id, customer_name, customer_type,
          order_type, subtotal, discount, delivery_fee, container_deposit, total_amount,
          amount_paid, change_amount, payment_method, payment_status, staff_name,
          is_vending_machine_consolidated, vending_machine_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Walk-in', ?, 0.00, 0.00, 0.00, ?, ?, 0.00, ?, 'Paid', ?, 0, NULL, ?)
      `).run(
        saleId,
        txNumber,
        today,
        timeStr,
        customer_id,
        customer_name,
        customer_type,
        subtotal,
        subtotal,
        subtotal,
        payment_method,
        staff.name,
        req.body?.notes || "Counter sale"
      );

      const insItem = db.prepare(`
        INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, unit, is_water, requires_container_swap, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const updStock = db.prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
      const insMov = db.prepare(`
        INSERT INTO stock_movements (id, date, product_id, product_name, movement_type, quantity, previous_stock, new_stock, reference_no, supplier_or_party, staff_name, notes)
        VALUES (?, ?, ?, ?, 'sale_deduction', ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const p of prepared) {
        insItem.run(
          generateId("sit"),
          saleId,
          p.prod.id,
          p.prod.name,
          p.qty,
          p.prod.price,
          p.prod.unit,
          p.prod.is_water,
          p.prod.requires_container_swap,
          p.lineTotal
        );
        updStock.run(p.qty, p.prod.id);
        insMov.run(
          generateId("mov"),
          now.toISOString(),
          p.prod.id,
          p.prod.name,
          -p.qty,
          p.prod.stock,
          p.prod.stock - p.qty,
          txNumber,
          customer_name,
          staff.name,
          `Sold via ${txNumber}`
        );
      }
    })();

    const sale = db.prepare("SELECT *, transaction_number as receipt_no, staff_name as recorded_by_name FROM sales WHERE id = ?").get(saleId);
    logActivity(staff.id, staff.username, staff.role, "SALE_RECORD", `Recorded POS sale ${txNumber} for ₱${sale.total_amount.toFixed(2)}`, "Sales");
    const items = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId);
    res.status(201).json({
      sale: {
        ...sale,
        created_at: `${sale.date} ${sale.time}`,
        status: "completed",
        print_count: 0,
        items
      }
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Unable to save sale." });
  }
});

app.post("/api/sales/:id/void", requireAuth, requireStaff, (req, res) => {
  const staff = req.user;
  const id = String(req.params.id);
  const reason = String(req.body?.reason || "").trim();
  const sale = db.prepare("SELECT * FROM sales WHERE id = ?").get(id);
  if (!sale) return res.status(404).json({ error: "Sale not found." });

  const items = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(id);
  db.transaction(() => {
    // Restore stock
    for (const item of items) {
      db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(item.quantity, item.product_id);
    }
    db.prepare("UPDATE sales SET payment_status = 'Voided', notes = notes || ? WHERE id = ?").run(` [VOIDED: ${reason}]`, id);
    logActivity(staff.id, staff.username, staff.role, "SALE_VOID", `Voided receipt ${sale.transaction_number}. Reason: ${reason}`, "Sales");
  })();
  res.json({ ok: true, message: `Voided ${sale.transaction_number}` });
});

// -------------------------------------------------------------
// Vending Machines & Vending Sales Routes (ERD: vending_machines)
// -------------------------------------------------------------
const VALID_VM_STATUSES = new Set(["operational", "maintenance", "out_of_service"]);

function formatVendingMachine(vm) {
  let lat = 10.1935;
  let lng = 122.8586;
  try {
    const parsed = JSON.parse(vm.coordinates_json || "{}");
    if (parsed.lat !== undefined) lat = Number(parsed.lat);
    if (parsed.lng !== undefined) lng = Number(parsed.lng);
  } catch {}
  return {
    ...vm,
    lat,
    lng
  };
}

app.get("/api/vending-machines", requireAuth, (_req, res) => {
  const rows = db.prepare(`
    SELECT vm.*,
      (SELECT COUNT(*) FROM vending_sales vs WHERE vs.machine_id = vm.id) as sales_count
    FROM vending_machines vm
    ORDER BY vm.code ASC, vm.id ASC
  `).all();
  res.json({ machines: rows.map(formatVendingMachine) });
});

app.post("/api/vending-machines", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const name = String(req.body?.name || "").trim();
  const location_name = String(req.body?.location_name || "").trim();
  const barangay = String(req.body?.barangay || "Brgy. Poblacion").trim();
  const rawCode = String(req.body?.code || "").trim();
  const water_capacity_liters = Number(req.body?.water_capacity_liters ?? 500);
  const current_water_level_liters = Number(req.body?.current_water_level_liters ?? water_capacity_liters);
  const coin_capacity = Number(req.body?.coin_capacity ?? 5000);
  const price_per_liter = Number(req.body?.price_per_liter ?? 2);
  const status = String(req.body?.status || "operational").trim();
  const notes = String(req.body?.notes || "").trim() || null;
  const lat = Number(req.body?.lat ?? 10.1935);
  const lng = Number(req.body?.lng ?? 122.8586);

  if (!name || !location_name || !barangay) {
    return res.status(400).json({ error: "Machine name, location name, and barangay are required." });
  }
  if (!VALID_VM_STATUSES.has(status)) {
    return res.status(400).json({ error: "Invalid vending machine status." });
  }
  if (Number.isNaN(water_capacity_liters) || water_capacity_liters <= 0 || Number.isNaN(price_per_liter) || price_per_liter <= 0) {
    return res.status(400).json({ error: "Water capacity and price per liter must be positive numbers." });
  }

  let code = rawCode;
  if (!code) {
    const count = db.prepare("SELECT COUNT(*) as cnt FROM vending_machines").get().cnt;
    code = `VND-BIN-${String(count + 1).padStart(2, "0")}`;
  }
  const dup = db.prepare("SELECT id FROM vending_machines WHERE LOWER(code) = LOWER(?)").get(code);
  if (dup) {
    return res.status(409).json({ error: `A vending machine with code "${code}" already exists.` });
  }

  const id = generateId("vm");
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO vending_machines (
      id, code, name, location_name, barangay, coordinates_json,
      water_capacity_liters, current_water_level_liters, coin_capacity, current_coin_total,
      price_per_liter, total_lifetime_sales, status, last_serviced, last_collection_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 0.00, ?, ?, ?, ?)
  `).run(
    id,
    code,
    name,
    location_name,
    barangay,
    JSON.stringify({ lat, lng }),
    water_capacity_liters,
    Math.max(0, current_water_level_liters),
    Math.max(0, coin_capacity),
    price_per_liter,
    status,
    today,
    today,
    notes
  );

  logActivity(admin.id, admin.username, admin.role, "VENDO_CREATE", `Added vending machine "${name}" (${code})`, "Vending");
  const created = db.prepare("SELECT *, 0 as sales_count FROM vending_machines WHERE id = ?").get(id);
  res.status(201).json({ machine: formatVendingMachine(created) });
});

app.put("/api/vending-machines/:id", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const id = String(req.params.id);
  const existing = db.prepare("SELECT * FROM vending_machines WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Vending machine not found." });

  const code = String(req.body?.code || existing.code).trim();
  const name = String(req.body?.name || existing.name).trim();
  const location_name = String(req.body?.location_name || existing.location_name).trim();
  const barangay = String(req.body?.barangay || existing.barangay).trim();
  const water_capacity_liters = Number(req.body?.water_capacity_liters ?? existing.water_capacity_liters);
  const current_water_level_liters = Number(req.body?.current_water_level_liters ?? existing.current_water_level_liters);
  const coin_capacity = Number(req.body?.coin_capacity ?? existing.coin_capacity);
  const price_per_liter = Number(req.body?.price_per_liter ?? existing.price_per_liter);
  const status = String(req.body?.status || existing.status).trim();
  const notes = req.body?.notes !== undefined ? (String(req.body.notes).trim() || null) : existing.notes;
  const last_serviced = String(req.body?.last_serviced || (status === "operational" && existing.status === "maintenance" ? new Date().toISOString().slice(0, 10) : existing.last_serviced));

  const currentCoords = formatVendingMachine(existing);
  const lat = Number(req.body?.lat ?? currentCoords.lat);
  const lng = Number(req.body?.lng ?? currentCoords.lng);

  if (!name || !location_name || !barangay || !code) {
    return res.status(400).json({ error: "Code, name, location name, and barangay are required." });
  }
  if (!VALID_VM_STATUSES.has(status)) {
    return res.status(400).json({ error: "Invalid vending machine status." });
  }
  const dup = db.prepare("SELECT id FROM vending_machines WHERE LOWER(code) = LOWER(?) AND id != ?").get(code, id);
  if (dup) {
    return res.status(409).json({ error: `Another vending machine already uses code "${code}".` });
  }

  db.prepare(`
    UPDATE vending_machines SET
      code = ?, name = ?, location_name = ?, barangay = ?, coordinates_json = ?,
      water_capacity_liters = ?, current_water_level_liters = ?, coin_capacity = ?,
      price_per_liter = ?, status = ?, last_serviced = ?, notes = ?
    WHERE id = ?
  `).run(
    code,
    name,
    location_name,
    barangay,
    JSON.stringify({ lat, lng }),
    water_capacity_liters,
    Math.max(0, current_water_level_liters),
    Math.max(0, coin_capacity),
    price_per_liter,
    status,
    last_serviced,
    notes,
    id
  );

  logActivity(admin.id, admin.username, admin.role, "VENDO_UPDATE", `Updated vending machine "${name}" (${code}, status: ${status})`, "Vending");
  const updated = db.prepare("SELECT *, (SELECT COUNT(*) FROM vending_sales WHERE machine_id = vending_machines.id) as sales_count FROM vending_machines WHERE id = ?").get(id);
  res.json({ machine: formatVendingMachine(updated) });
});

app.patch("/api/vending-machines/:id/status", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const id = String(req.params.id);
  const status = String(req.body?.status || "").trim();
  if (!VALID_VM_STATUSES.has(status)) {
    return res.status(400).json({ error: "Status must be operational, maintenance, or out_of_service." });
  }
  const existing = db.prepare("SELECT * FROM vending_machines WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Vending machine not found." });

  const today = new Date().toISOString().slice(0, 10);
  const nextServiced = status === "maintenance" || (existing.status === "maintenance" && status === "operational") ? today : existing.last_serviced;
  db.prepare("UPDATE vending_machines SET status = ?, last_serviced = ? WHERE id = ?").run(status, nextServiced, id);
  logActivity(admin.id, admin.username, admin.role, "VENDO_STATUS", `Changed "${existing.name}" status from ${existing.status} to ${status}`, "Vending");
  const updated = db.prepare("SELECT *, (SELECT COUNT(*) FROM vending_sales WHERE machine_id = vending_machines.id) as sales_count FROM vending_machines WHERE id = ?").get(id);
  res.json({ machine: formatVendingMachine(updated) });
});

app.delete("/api/vending-machines/:id", requireAuth, requireAdmin, (req, res) => {
  const admin = req.user;
  const id = String(req.params.id);
  const existing = db.prepare("SELECT * FROM vending_machines WHERE id = ?").get(id);
  if (!existing) return res.status(404).json({ error: "Vending machine not found." });

  const salesCount = db.prepare("SELECT COUNT(*) as cnt FROM vending_sales WHERE machine_id = ?").get(id).cnt;
  if (salesCount > 0) {
    return res.status(409).json({
      hasSalesHistory: true,
      error: `Cannot delete "${existing.name}" because it has ${salesCount} recorded collection entry(ies). Set its status to Out of Service instead to preserve sales history.`
    });
  }

  db.prepare("DELETE FROM vending_machines WHERE id = ?").run(id);
  logActivity(admin.id, admin.username, admin.role, "VENDO_DELETE", `Deleted vending machine "${existing.name}" (${existing.code})`, "Vending");
  res.json({ ok: true });
});

app.get("/api/vending-sales", requireAuth, (_req, res) => {
  const machines = db.prepare(
    "SELECT *, current_water_level_liters as stock_qty, 50 as min_stock_level FROM vending_machines WHERE status != 'out_of_service' ORDER BY code ASC, id ASC"
  ).all();
  const rawSales = db.prepare(`
    SELECT vs.*, vs.coins_collected as amount, vs.date as sale_date, COALESCE(vm.location_name, '') as location_name
    FROM vending_sales vs
    LEFT JOIN vending_machines vm ON vm.id = vs.machine_id
    ORDER BY vs.date DESC, vs.id DESC
  `).all();
  const vendingSales = rawSales.map((vs) => ({
    ...vs,
    status: String(vs.notes || "").includes("[VOIDED:") ? "voided" : "completed"
  }));
  res.json({ machines, vendingSales });
});

app.post("/api/vending-sales", requireAuth, requireStaff, (req, res) => {
  const staff = req.user;
  const machine_id = String(req.body?.machine_id || "");
  const amount = Number(req.body?.amount ?? req.body?.coins_collected);
  const date = String(req.body?.sale_date || req.body?.date || new Date().toISOString().slice(0, 10));
  const notes = String(req.body?.notes || "").trim();
  const allowDuplicate = Boolean(req.body?.allowDuplicate);

  const machine = db.prepare("SELECT * FROM vending_machines WHERE id = ?").get(machine_id);
  if (!machine) return res.status(404).json({ error: "Vending machine not found." });
  if (machine.status === "out_of_service") {
    return res.status(400).json({ error: `"${machine.name}" is marked Out of Service and cannot accept new collections.` });
  }
  if (Number.isNaN(amount) || amount < 0) return res.status(400).json({ error: "Amount must be a valid non-negative number." });

  if (!allowDuplicate) {
    const existing = db.prepare(
      "SELECT id, coins_collected FROM vending_sales WHERE machine_id = ? AND date = ? AND COALESCE(notes, '') NOT LIKE '%[VOIDED:%'"
    ).get(machine.id, date);
    if (existing) {
      return res.status(409).json({
        duplicate: true,
        error: `A collection entry (₱${Number(existing.coins_collected).toFixed(2)}) already exists for ${machine.name} on ${date}. Save an additional entry anyway?`
      });
    }
  }

  const id = generateId("vsl");
  db.prepare(`
    INSERT INTO vending_sales (id, machine_id, machine_name, date, coins_collected, water_dispensed_liters, meter_reading_start, meter_reading_end, water_refilled_liters, recorded_by, notes)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?)
  `).run(id, machine.id, machine.name, date, amount, Math.round(amount / (machine.price_per_liter || 2)), staff.name, notes);

  db.prepare("UPDATE vending_machines SET total_lifetime_sales = total_lifetime_sales + ?, last_collection_date = ? WHERE id = ?").run(amount, date, machine.id);
  logActivity(staff.id, staff.username, staff.role, "VENDO_COLLECT", `Collected ₱${amount.toFixed(2)} from ${machine.name}`, "Sales");
  res.status(201).json({ ok: true, id });
});

app.post("/api/vending-sales/:id/void", requireAuth, requireStaff, (req, res) => {
  const id = String(req.params.id);
  const reason = String(req.body?.reason || "").trim();
  const vs = db.prepare("SELECT * FROM vending_sales WHERE id = ?").get(id);
  if (!vs) return res.status(404).json({ error: "Vending collection record not found." });
  if (String(vs.notes || "").includes("[VOIDED:")) {
    return res.status(400).json({ error: "Vending collection record is already voided." });
  }

  db.transaction(() => {
    db.prepare("UPDATE vending_sales SET notes = COALESCE(notes, '') || ? WHERE id = ?").run(` [VOIDED: ${reason}]`, id);
    db.prepare("UPDATE vending_machines SET total_lifetime_sales = MAX(0, total_lifetime_sales - ?) WHERE id = ?").run(
      Number(vs.coins_collected || 0),
      vs.machine_id
    );
    logActivity(req.user.id, req.user.username, req.user.role, "VENDO_VOID", `Voided collection from ${vs.machine_name} (${reason})`, "Sales");
  })();
  res.json({ ok: true });
});

// -------------------------------------------------------------
// Orders & Order Items Routes (ERD: orders & order_items)
// -------------------------------------------------------------
app.get("/api/orders", requireAuth, (_req, res) => {
  const rows = db.prepare("SELECT o.*, o.order_number as order_no FROM orders o ORDER BY o.date DESC, o.time DESC, o.id DESC").all();
  const getItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?");

  const orders = rows.map((o) => {
    const items = getItems.all(o.id);
    const amountPaid = o.payment_status === "Paid" ? o.total_amount : o.payment_status === "Partial" ? o.total_amount / 2 : 0;
    return {
      ...o,
      order_no: o.order_number,
      requested_datetime: o.requested_schedule,
      amount_paid: amountPaid,
      items
    };
  });
  res.json({ orders });
});

app.post("/api/orders", requireAuth, requireStaff, (req, res) => {
  const staff = req.user;
  const customer_id = String(req.body?.customer_id);
  const order_type = String(req.body?.order_type || "Delivery");
  const requested_datetime = String(req.body?.requested_datetime || new Date().toISOString());
  const notes = String(req.body?.notes || "").trim();
  const itemsInput = Array.isArray(req.body?.items) ? req.body.items : [];

  if (!customer_id || itemsInput.length === 0) {
    return res.status(400).json({ error: "Customer and at least one product item are required." });
  }
  const cust = db.prepare("SELECT * FROM customers WHERE id = ?").get(customer_id);
  if (!cust) return res.status(404).json({ error: "Customer not found." });

  const delivery_location_id = req.body?.delivery_location_id ? String(req.body.delivery_location_id) : null;
  const custLocations = extractLocations(cust);
  const chosenLoc = delivery_location_id
    ? custLocations.find((l) => String(l.id) === delivery_location_id) || custLocations[0]
    : custLocations[0];
  const orderAddress = order_type === "Delivery" && chosenLoc ? chosenLoc.address : cust.primary_address;
  const orderBarangay = order_type === "Delivery" && chosenLoc ? chosenLoc.barangay : cust.barangay;
  const orderCoords = order_type === "Delivery" && chosenLoc
    ? JSON.stringify({ lat: chosenLoc.lat, lng: chosenLoc.lng })
    : cust.coordinates_json || JSON.stringify({ lat: 10.1935, lng: 122.8586 });

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const timeStr = now.toISOString().slice(11, 16);
  const orderId = generateId("ord");
  const orderNumber = nextCode("ORD", "orders", "order_number");

  let subtotal = 0;
  const prepared = [];
  for (const it of itemsInput) {
    const prod = db.prepare("SELECT * FROM products WHERE id = ?").get(String(it.product_id));
    if (!prod) return res.status(404).json({ error: "Product item not found." });
    const qty = Number(it.quantity);
    if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Quantity must be greater than zero." });
    const lineTotal = prod.price * qty;
    subtotal += lineTotal;
    prepared.push({ prod, qty, lineTotal });
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO orders (
        id, order_number, date, time, customer_id, customer_name, customer_phone,
        delivery_address, barangay, coordinates_json, delivery_notes, subtotal, delivery_fee,
        total_amount, payment_method, payment_status, order_type, status, assigned_personnel,
        delivery_vehicle, requested_schedule, estimated_delivery_time, delivered_at,
        containers_to_return_count, containers_returned_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'Cash', 'Unpaid', ?, 'Pending', ?, 'Tricycle', ?, 'TBD', NULL, 0, NULL)
    `).run(
      orderId,
      orderNumber,
      today,
      timeStr,
      cust.id,
      cust.name,
      cust.contact_number,
      orderAddress,
      orderBarangay,
      orderCoords,
      notes,
      subtotal,
      subtotal,
      order_type,
      order_type === "Delivery" ? DELIVERY_PERSONNEL_ROSTER[0] : null,
      requested_datetime
    );

    const insItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, unit, is_water, requires_container_swap, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of prepared) {
      insItem.run(
        generateId("oit"),
        orderId,
        p.prod.id,
        p.prod.name,
        p.qty,
        p.prod.price,
        p.prod.unit,
        p.prod.is_water,
        p.prod.requires_container_swap,
        p.lineTotal
      );
    }
  })();

  logActivity(staff.id, staff.username, staff.role, "ORDER_CREATE", `Created order ${orderNumber} for ${cust.name}`, "Orders");
  const order = db.prepare("SELECT *, order_number as order_no FROM orders WHERE id = ?").get(orderId);
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId);
  res.status(201).json({ order: { ...order, order_no: order.order_number, items } });
});

app.put("/api/orders/:id", requireAuth, requireStaff, (req, res) => {
  const id = String(req.params.id);
  const target = db.prepare("SELECT * FROM orders WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "Order not found." });

  const status = req.body?.status || target.status;
  const order_type = req.body?.order_type || target.order_type;
  const requested_schedule = req.body?.requested_datetime || req.body?.requested_schedule || target.requested_schedule;
  const notes = req.body?.notes !== undefined ? String(req.body.notes) : target.delivery_notes;
  const delivery_location_id = req.body?.delivery_location_id ? String(req.body.delivery_location_id) : null;
  const itemsInput = Array.isArray(req.body?.items) ? req.body.items : null;

  let delivery_address = target.delivery_address;
  let barangay = target.barangay;
  let coordinates_json = target.coordinates_json;

  if (order_type === "Delivery" && delivery_location_id && target.customer_id) {
    const cust = db.prepare("SELECT * FROM customers WHERE id = ?").get(target.customer_id);
    if (cust) {
      const chosenLoc = extractLocations(cust).find((l) => String(l.id) === delivery_location_id);
      if (chosenLoc) {
        delivery_address = chosenLoc.address;
        barangay = chosenLoc.barangay;
        coordinates_json = JSON.stringify({ lat: chosenLoc.lat, lng: chosenLoc.lng });
      }
    }
  }

  let nextSubtotal = target.subtotal;
  const prepared = [];
  if (itemsInput && itemsInput.length > 0) {
    nextSubtotal = 0;
    for (const it of itemsInput) {
      const prod = db.prepare("SELECT * FROM products WHERE id = ?").get(String(it.product_id));
      if (!prod) return res.status(404).json({ error: "Product item not found." });
      const qty = Number(it.quantity);
      if (Number.isNaN(qty) || qty <= 0) return res.status(400).json({ error: "Quantity must be greater than zero." });
      const lineTotal = prod.price * qty;
      nextSubtotal += lineTotal;
      prepared.push({ prod, qty, lineTotal });
    }
  }

  db.transaction(() => {
    db.prepare(`
      UPDATE orders SET
        status = ?, order_type = ?, requested_schedule = ?, delivery_notes = ?,
        delivery_address = ?, barangay = ?, coordinates_json = ?,
        subtotal = ?, total_amount = ?
      WHERE id = ?
    `).run(
      status,
      order_type,
      requested_schedule,
      notes,
      delivery_address,
      barangay,
      coordinates_json,
      nextSubtotal,
      nextSubtotal + Number(target.delivery_fee || 0),
      id
    );

    if (prepared.length > 0) {
      db.prepare("DELETE FROM order_items WHERE order_id = ?").run(id);
      const insItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, unit, is_water, requires_container_swap, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of prepared) {
        insItem.run(
          generateId("oit"),
          id,
          p.prod.id,
          p.prod.name,
          p.qty,
          p.prod.price,
          p.prod.unit,
          p.prod.is_water,
          p.prod.requires_container_swap,
          p.lineTotal
        );
      }
    }
  })();

  logActivity(req.user.id, req.user.username, req.user.role, "ORDER_UPDATE", `Updated order ${target.order_number}`, "Orders");
  res.json({ ok: true });
});

app.post("/api/orders/:id/cancel", requireAuth, requireStaff, (req, res) => {
  const id = String(req.params.id);
  const reason = String(req.body?.reason || "Cancelled by staff").trim();
  db.prepare("UPDATE orders SET status = 'Cancelled', delivery_notes = delivery_notes || ? WHERE id = ?").run(
    ` [CANCELLED: ${reason}]`,
    id
  );
  logActivity(req.user.id, req.user.username, req.user.role, "ORDER_CANCEL", `Cancelled order ${id} (${reason})`, "Orders");
  res.json({ ok: true });
});

// -------------------------------------------------------------
// Payments Route (Recorded on Order / Sale)
// -------------------------------------------------------------
app.get("/api/payments", requireAuth, (_req, res) => {
  // Collect recorded payments from orders and sales
  const paidOrders = db.prepare("SELECT * FROM orders WHERE payment_status IN ('Paid', 'Partial') ORDER BY date DESC, time DESC").all();
  const payments = paidOrders.map((o, idx) => ({
    id: `pay_${o.id}`,
    payment_no: `PAY-2026-${String(idx + 1).padStart(4, "0")}`,
    order_id: o.id,
    order_no: o.order_number,
    customer_id: o.customer_id,
    customer_name: o.customer_name,
    amount: o.payment_status === "Paid" ? o.total_amount : o.total_amount / 2,
    method: o.payment_method || "Cash",
    reference_note: "Recorded order payment",
    created_at: `${o.date} ${o.time}`
  }));
  res.json({ payments });
});

app.post("/api/payments", requireAuth, requireStaff, (req, res) => {
  const staff = req.user;
  const order_id = String(req.body?.order_id);
  const amount = Number(req.body?.amount);
  const method = String(req.body?.method || "Cash");
  const ref = String(req.body?.reference_note || "");

  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(order_id);
  if (!order) return res.status(404).json({ error: "Order not found." });

  const nextStatus = amount >= order.total_amount ? "Paid" : "Partial";
  db.prepare("UPDATE orders SET payment_status = ?, payment_method = ? WHERE id = ?").run(nextStatus, method, order.id);
  logActivity(staff.id, staff.username, staff.role, "PAYMENT_RECORD", `Recorded ₱${amount.toFixed(2)} payment for order ${order.order_number}`, "Orders");
  res.status(201).json({ ok: true, orderPaymentStatus: nextStatus });
});

// -------------------------------------------------------------
// Containers Tracking Routes (ERD: containers)
// -------------------------------------------------------------
app.get("/api/containers", requireAuth, (_req, res) => {
  const containerProducts = db.prepare("SELECT *, stock as stock_qty FROM products WHERE category = 'Water Container'").all();
  const rawRecords = db.prepare("SELECT * FROM containers ORDER BY date DESC, id DESC").all();

  const records = rawRecords.map((r) => ({
    id: r.id,
    customer_id: r.customer_id,
    customer_name: r.customer_name,
    product_name: r.container_type,
    record_type: r.action_type === "customer_owned" ? "customer_owned" : "borrowed",
    qty_borrowed: r.action_type === "borrowed" ? r.quantity : 0,
    qty_returned: r.action_type === "returned" ? r.quantity : 0,
    qty_damaged: 0,
    status: r.status,
    notes: r.notes,
    created_at: r.date,
    updated_at: r.date
  }));

  res.json({ containerProducts, records });
});

app.post("/api/containers", requireAuth, requireStaff, (req, res) => {
  const staff = req.user;
  const customer_id = String(req.body?.customer_id);
  const record_type = String(req.body?.record_type || "borrowed");
  const quantity = Number(req.body?.quantity || 1);
  const notes = String(req.body?.notes || "").trim();

  const cust = db.prepare("SELECT name FROM customers WHERE id = ?").get(customer_id);
  if (!cust) return res.status(404).json({ error: "Customer not found." });

  const id = generateId("cnt");
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO containers (id, date, customer_id, customer_name, container_type, action_type, quantity, deposit_amount, refund_amount, status, notes, staff_name)
    VALUES (?, ?, ?, ?, '5-Gallon Container', ?, ?, 0.00, 0.00, ?, ?, ?)
  `).run(
    id,
    now,
    customer_id,
    cust.name,
    record_type === "customer_owned" ? "customer_owned" : "borrowed",
    quantity,
    record_type === "customer_owned" ? "Customer-Owned" : "Open",
    notes,
    staff.name
  );

  logActivity(staff.id, staff.username, staff.role, "CONTAINER_TRACK", `Recorded ${quantity} ${record_type} containers for ${cust.name}`, "Containers");
  res.status(201).json({ ok: true });
});

app.post("/api/containers/:id/return", requireAuth, requireStaff, (req, res) => {
  const id = String(req.params.id);
  const retGood = Number(req.body?.returned_good || 1);
  const target = db.prepare("SELECT * FROM containers WHERE id = ?").get(id);
  if (!target) return res.status(404).json({ error: "Container record not found." });

  db.prepare("UPDATE containers SET status = 'Closed', notes = notes || ? WHERE id = ?").run(
    ` [Returned ${retGood} units]`,
    id
  );
  logActivity(req.user.id, req.user.username, req.user.role, "CONTAINER_RETURN", `Recorded container return for ${target.customer_name}`, "Containers");
  res.json({ ok: true });
});

// -------------------------------------------------------------
// Deliveries Routes (ERD: mapped from orders with order_type = 'Delivery')
// -------------------------------------------------------------
app.get("/api/deliveries", requireAuth, (_req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE order_type = 'Delivery' ORDER BY date DESC, time DESC").all();
  const getItems = db.prepare("SELECT * FROM order_items WHERE order_id = ?");

  const deliveries = orders.map((o) => {
    let lat = 10.1935;
    let lng = 122.8586;
    try {
      const parsed = JSON.parse(o.coordinates_json || "{}");
      lat = parsed.lat || lat;
      lng = parsed.lng || lng;
    } catch {}
    const items = getItems.all(o.id);
    return {
      id: o.id,
      delivery_no: `DEL-${o.order_number.replace(/^ORD-/, "")}`,
      order_id: o.id,
      order_no: o.order_number,
      customer_id: o.customer_id,
      customer_name: o.customer_name,
      customer_contact: o.customer_phone,
      order_total: o.total_amount,
      amount_paid: o.payment_status === "Paid" ? o.total_amount : o.payment_status === "Partial" ? o.total_amount / 2 : 0,
      payment_status: o.payment_status,
      assigned_personnel: o.assigned_personnel || DELIVERY_PERSONNEL_ROSTER[0],
      delivery_vehicle: o.delivery_vehicle || "Tricycle",
      scheduled_datetime: o.requested_schedule,
      status: o.status,
      address: o.delivery_address,
      barangay: o.barangay,
      lat,
      lng,
      notes: o.delivery_notes,
      share_token: o.id,
      delivered_at: o.delivered_at,
      items
    };
  });

  res.json({ deliveries, personnelRoster: DELIVERY_PERSONNEL_ROSTER });
});

app.post("/api/deliveries", requireAuth, requireStaff, (req, res) => {
  const order_id = String(req.body?.order_id);
  const personnel = String(req.body?.assigned_personnel || DELIVERY_PERSONNEL_ROSTER[0]);
  const schedule = String(req.body?.scheduled_datetime || new Date().toISOString());
  const notes = req.body?.notes !== undefined ? String(req.body.notes) : null;

  db.prepare(
    "UPDATE orders SET assigned_personnel = ?, requested_schedule = ?, status = 'Pending', delivery_notes = COALESCE(?, delivery_notes) WHERE id = ?"
  ).run(personnel, schedule, notes, order_id);
  logActivity(req.user.id, req.user.username, req.user.role, "DELIVERY_SCHEDULE", `Scheduled delivery ${order_id} with ${personnel}`, "Deliveries");
  res.status(201).json({ ok: true });
});

app.put("/api/deliveries/:id", requireAuth, requireStaff, (req, res) => {
  const id = String(req.params.id);
  const status = req.body?.status;
  const personnel = req.body?.assigned_personnel;
  const schedule = req.body?.scheduled_datetime;
  const notes = req.body?.notes;
  const cancel_reason = req.body?.cancel_reason;

  if (status) {
    const deliveredAt = status === "Delivered" ? new Date().toISOString() : null;
    db.prepare("UPDATE orders SET status = ?, delivered_at = COALESCE(?, delivered_at) WHERE id = ?").run(status, deliveredAt, id);
  }
  if (personnel) {
    db.prepare("UPDATE orders SET assigned_personnel = ? WHERE id = ?").run(personnel, id);
  }
  if (schedule) {
    db.prepare("UPDATE orders SET requested_schedule = ? WHERE id = ?").run(schedule, id);
  }
  if (notes !== undefined) {
    db.prepare("UPDATE orders SET delivery_notes = ? WHERE id = ?").run(String(notes), id);
  }
  if (cancel_reason) {
    db.prepare("UPDATE orders SET delivery_notes = COALESCE(delivery_notes, '') || ? WHERE id = ?").run(` [CANCELLED: ${cancel_reason}]`, id);
  }
  res.json({ ok: true });
});

// -------------------------------------------------------------
// Print Slips Route
// -------------------------------------------------------------
app.post("/api/print/:type/:id", requireAuth, (_req, res) => {
  res.json({ ok: true, isReprint: false, printCount: 1 });
});

// -------------------------------------------------------------
// Admin Dashboard & Reports Routes
// -------------------------------------------------------------
app.get("/api/admin/dashboard", requireAuth, requireAdmin, (_req, res) => {
  const stationSales = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as tot FROM sales WHERE payment_status = 'Paid'").get().tot;
  const vendoSales = db.prepare("SELECT COALESCE(SUM(coins_collected), 0) as tot FROM vending_sales WHERE COALESCE(notes, '') NOT LIKE '%[VOIDED:%'").get().tot;
  const pendingOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status IN ('Pending', 'Preparing', 'Out for Delivery')").get().cnt;
  const completedDeliveries = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Delivered'").get().cnt;
  const lowStock = db.prepare("SELECT *, stock as stock_qty, min_stock as min_stock_level FROM products WHERE stock <= min_stock").all();
  const availableContainers = db.prepare("SELECT COALESCE(SUM(stock), 0) as tot FROM products WHERE is_water = 0 AND (category = 'Containers' OR name LIKE '%Container%')").get().tot;
  const lowStockVendo = db.prepare("SELECT id, name, location_name, current_water_level_liters as stock_qty, 100 as min_stock_level FROM vending_machines WHERE status != 'out_of_service' AND current_water_level_liters <= 100").all();

  const customers = db.prepare("SELECT coordinates_json, additional_locations_json FROM customers").all();
  let customerLocationsCount = 0;
  customers.forEach((c) => {
    try {
      const p = JSON.parse(c.coordinates_json || "{}");
      if (p.lat) customerLocationsCount++;
      const extra = JSON.parse(c.additional_locations_json || "[]");
      if (Array.isArray(extra)) customerLocationsCount += extra.length;
    } catch {}
  });

  const complianceCount = db.prepare("SELECT COUNT(*) as cnt FROM compliance_logs").get().cnt;

  res.json({
    totalSales: stationSales + vendoSales,
    stationSalesTotal: stationSales,
    vendingSalesTotal: vendoSales,
    pendingOrdersCount: pendingOrders,
    completedDeliveriesCount: completedDeliveries,
    availableContainersCount: availableContainers,
    lowStockCount: lowStock.length + lowStockVendo.length,
    customerLocationsCount,
    complianceLogsCount: complianceCount,
    lowStockProducts: lowStock,
    lowStockVendo
  });
});

app.get("/api/admin/sales-summary", requireAuth, requireAdmin, (req, res) => {
  const period = String(req.query.period || "daily");
  const source = String(req.query.source || "all");

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  let cutoffDate = todayStr;
  if (period === "weekly") {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    cutoffDate = d.toISOString().slice(0, 10);
  } else if (period === "monthly") {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    cutoffDate = d.toISOString().slice(0, 10);
  }

  // 1. Station Counter Sales
  let stationSales = [];
  if (source !== "vending") {
    let salesQuery = "SELECT * FROM sales WHERE payment_status != 'Voided'";
    const params = [];
    if (period !== "all") {
      salesQuery += " AND date >= ?";
      params.push(cutoffDate);
    }
    salesQuery += " ORDER BY date DESC, time DESC";
    const rawSales = db.prepare(salesQuery).all(...params);
    const getItems = db.prepare("SELECT * FROM sale_items WHERE sale_id = ?");

    stationSales = rawSales.map((s) => ({
      id: s.id,
      receipt_no: s.transaction_number,
      customer_id: s.customer_id,
      customer_name: s.customer_name,
      customer_type: s.customer_type,
      payment_method: s.payment_method,
      payment_status: s.payment_status,
      total_amount: Number(s.total_amount || 0),
      created_at: s.date ? `${s.date}T${s.time || "12:00"}:00` : new Date().toISOString(),
      date: s.date,
      time: s.time,
      recorded_by_name: s.staff_name,
      notes: s.notes,
      items: getItems.all(s.id).map((it) => ({
        id: it.id,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: Number(it.unit_price || 0),
        line_total: Number(it.total || 0)
      }))
    }));
  }

  // 2. Order Payments
  let orderPayments = [];
  if (source !== "vending") {
    let ordersQuery = "SELECT * FROM orders WHERE payment_status IN ('Paid', 'Partial')";
    const params = [];
    if (period !== "all") {
      ordersQuery += " AND date >= ?";
      params.push(cutoffDate);
    }
    ordersQuery += " ORDER BY date DESC, time DESC";
    const rawOrders = db.prepare(ordersQuery).all(...params);

    orderPayments = rawOrders.map((o) => {
      const amount = o.payment_status === "Paid" ? Number(o.total_amount || 0) : Number(o.total_amount || 0) / 2;
      return {
        id: `pay_${o.id}`,
        payment_no: `PAY-${o.order_number.replace(/^ORD-/, "")}`,
        order_no: o.order_number,
        order_type: o.order_type,
        customer_name: o.customer_name,
        method: o.payment_method,
        created_at: o.date ? `${o.date}T${o.time || "12:00"}:00` : new Date().toISOString(),
        amount,
        order_payment_status: o.payment_status,
        recorded_by_name: o.assigned_personnel || "Staff",
        reference_note: o.delivery_notes || o.delivery_address
      };
    });
  }

  // 3. Vending Collections
  let vendingSales = [];
  if (source !== "station") {
    let vendoQuery = `
      SELECT vs.*, vm.location_name
      FROM vending_sales vs
      LEFT JOIN vending_machines vm ON vs.machine_id = vm.id
      WHERE COALESCE(vs.notes, '') NOT LIKE '%[VOIDED:%'
    `;
    const params = [];
    if (period !== "all") {
      vendoQuery += " AND vs.date >= ?";
      params.push(cutoffDate);
    }
    vendoQuery += " ORDER BY vs.date DESC, vs.id DESC";
    const rawVendo = db.prepare(vendoQuery).all(...params);

    vendingSales = rawVendo.map((vs) => ({
      id: vs.id,
      machine_id: vs.machine_id,
      machine_name: vs.machine_name,
      location_name: vs.location_name || "Binalbagan Location",
      sale_date: vs.date,
      created_at: vs.date ? `${vs.date}T12:00:00` : new Date().toISOString(),
      amount: Number(vs.coins_collected || 0),
      water_dispensed_liters: vs.water_dispensed_liters,
      recorded_by_name: vs.recorded_by,
      notes: vs.notes
    }));
  }

  const stationCounterSum = stationSales.reduce((acc, s) => acc + s.total_amount, 0);
  const orderPaymentsSum = orderPayments.reduce((acc, p) => acc + p.amount, 0);
  const stationTotal = stationCounterSum + orderPaymentsSum;
  const vendingTotal = vendingSales.reduce((acc, vs) => acc + vs.amount, 0);
  const grandTotal = stationTotal + vendingTotal;

  res.json({
    period,
    source,
    grandTotal,
    stationTotal,
    vendingTotal,
    stationSales,
    orderPayments,
    vendingSales
  });
});

app.get("/api/admin/delivery-areas", requireAuth, requireAdmin, (req, res) => {
  const filterBarangay = String(req.query.barangay || "All").trim();
  const pendingOnly = req.query.pendingOnly === "true";

  const customers = db.prepare("SELECT * FROM customers").all();
  const allLocations = [];
  const barangayCounts = {};

  customers.forEach((c) => {
    const locs = extractLocations(c);
    const deliveryCount = db.prepare(
      "SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ? AND status = 'Delivered'"
    ).get(c.id).cnt;
    const openOrdersCount = db.prepare(
      "SELECT COUNT(*) as cnt FROM orders WHERE customer_id = ? AND status IN ('Pending', 'Preparing', 'Out for Delivery')"
    ).get(c.id).cnt;

    locs.forEach((l) => {
      const item = {
        id: l.id,
        customer_id: c.id,
        customer_name: c.name,
        label: l.label,
        address: l.address,
        barangay: l.barangay,
        landmark_notes: l.landmark_notes,
        lat: l.lat,
        lng: l.lng,
        delivery_count: deliveryCount,
        open_orders_count: openOrdersCount
      };
      allLocations.push(item);

      if (!barangayCounts[l.barangay]) {
        barangayCounts[l.barangay] = { locations: 0, deliveries: 0 };
      }
      barangayCounts[l.barangay].locations += 1;
      barangayCounts[l.barangay].deliveries += deliveryCount;
    });
  });

  const allBarangays = Object.keys(barangayCounts).sort();
  const areaFrequency = allBarangays.map((b) => ({
    barangay: b,
    locations: barangayCounts[b].locations,
    deliveries: barangayCounts[b].deliveries
  }));

  let filteredLocations = allLocations;
  if (filterBarangay && filterBarangay !== "All") {
    filteredLocations = filteredLocations.filter((l) => l.barangay === filterBarangay);
  }
  if (pendingOnly) {
    filteredLocations = filteredLocations.filter((l) => l.open_orders_count > 0);
  }

  res.json({
    station: getStationInfo(),
    locations: filteredLocations,
    allBarangays,
    areaFrequency
  });
});

app.get("/api/admin/reports", requireAuth, requireAdmin, (req, res) => {
  const type = String(req.query.type || "sales");
  const start = String(req.query.start || "").trim();
  const end = String(req.query.end || "").trim();

  if (start && end && end < start) {
    res.status(400).json({ error: "Invalid date range: end date cannot be earlier than start date." });
    return;
  }

  const buildDateFilter = (col) => {
    const clauses = [];
    const params = [];
    if (start) {
      clauses.push(`substr(${col}, 1, 10) >= ?`);
      params.push(start);
    }
    if (end) {
      clauses.push(`substr(${col}, 1, 10) <= ?`);
      params.push(end);
    }
    return {
      where: clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "",
      and: clauses.length > 0 ? ` AND ${clauses.join(" AND ")}` : "",
      params
    };
  };

  let rows = [];
  switch (type) {
    case "sales": {
      const df = buildDateFilter("date");
      rows = db.prepare(`SELECT transaction_number as receipt_no, date, time, customer_name, total_amount, payment_method, staff_name FROM sales${df.where} ORDER BY date DESC`).all(...df.params);
      break;
    }
    case "inventory":
      rows = db.prepare("SELECT code, name, category, stock as available_stock, min_stock as threshold, unit, price FROM products ORDER BY stock ASC").all();
      break;
    case "customers": {
      const df = buildDateFilter("registered_date");
      rows = db.prepare(`SELECT name, contact_number, customer_type, primary_address, barangay, registered_date FROM customers${df.where} ORDER BY registered_date DESC`).all(...df.params);
      break;
    }
    case "products":
      rows = db.prepare("SELECT code, name, category, price, cost, stock, unit FROM products ORDER BY name ASC").all();
      break;
    case "orders": {
      const df = buildDateFilter("date");
      rows = db.prepare(`SELECT order_number, date, customer_name, delivery_address, total_amount, payment_status, status, assigned_personnel FROM orders${df.where} ORDER BY date DESC`).all(...df.params);
      break;
    }
    case "payments": {
      const df = buildDateFilter("date");
      rows = db.prepare(`SELECT transaction_number as reference_no, date, customer_name, total_amount as amount, payment_method, staff_name FROM sales${df.where} ORDER BY date DESC`).all(...df.params);
      break;
    }
    case "containers": {
      const df = buildDateFilter("date");
      rows = db.prepare(`SELECT substr(date, 1, 10) as date, customer_name, container_type, action_type, quantity, status, staff_name FROM containers${df.where} ORDER BY date DESC`).all(...df.params);
      break;
    }
    case "deliveries": {
      const df = buildDateFilter("date");
      rows = db.prepare(`SELECT order_number as delivery_order, date, customer_name, delivery_address, assigned_personnel, status, delivered_at FROM orders WHERE order_type = 'Delivery'${df.and} ORDER BY date DESC`).all(...df.params);
      break;
    }
    case "vending": {
      const df = buildDateFilter("date");
      rows = db.prepare(`SELECT machine_name, date, coins_collected as total_sales, water_dispensed_liters, recorded_by FROM vending_sales${df.where} ORDER BY date DESC`).all(...df.params);
      break;
    }
    case "locations": {
      const allCust = db.prepare("SELECT name, primary_address, barangay, coordinates_json FROM customers").all();
      rows = allCust.map((c) => {
        let coords = "";
        try {
          const p = JSON.parse(c.coordinates_json || "{}");
          coords = `${p.lat}, ${p.lng}`;
        } catch {}
        return {
          customer_name: c.name,
          address: c.primary_address,
          barangay: c.barangay,
          coordinates: coords
        };
      });
      break;
    }
    case "compliance": {
      const df = buildDateFilter("date");
      rows = db.prepare(`SELECT date, log_type, parameter_name, recorded_value, inspector_or_staff, status, notes FROM compliance_logs${df.where} ORDER BY date DESC`).all(...df.params);
      break;
    }
    default:
      rows = db.prepare("SELECT * FROM sales LIMIT 50").all();
  }
  res.json({ rows });
});

app.get("/api/admin/activity-logs", requireAuth, requireAdmin, (req, res) => {
  const username = String(req.query.username || "").trim();
  const action = String(req.query.action || "").trim();
  const date = String(req.query.date || "").trim();

  const clauses = [];
  const params = [];
  if (username && username !== "All") {
    clauses.push("user_name = ?");
    params.push(username);
  }
  if (action && action !== "All") {
    clauses.push("action = ?");
    params.push(action);
  }
  if (date) {
    clauses.push("substr(timestamp, 1, 10) = ?");
    params.push(date);
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const logs = db.prepare(
    `SELECT id, timestamp, timestamp as created_at, user_id, user_name as username, user_role, action as action_type, details as description, category
     FROM activity_logs${where}
     ORDER BY timestamp DESC
     LIMIT 200`
  ).all(...params);

  const usernames = db.prepare(
    "SELECT DISTINCT user_name FROM activity_logs WHERE TRIM(COALESCE(user_name, '')) != '' ORDER BY user_name ASC"
  ).all().map((r) => r.user_name);

  const actions = db.prepare(
    "SELECT DISTINCT action FROM activity_logs WHERE TRIM(COALESCE(action, '')) != '' ORDER BY action ASC"
  ).all().map((r) => r.action);

  res.json({ logs, usernames, actions });
});

app.get("/api/search", requireAuth, (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const status = String(req.query.status || "").trim();
  const customerType = String(req.query.customerType || "").trim();
  const date = String(req.query.date || "").trim();
  const like = `%${q}%`;

  const custClauses = ["(LOWER(name) LIKE ? OR contact_number LIKE ? OR LOWER(primary_address) LIKE ? OR LOWER(barangay) LIKE ?)"];
  const custParams = [like, like, like, like];
  if (customerType && customerType !== "All") {
    custClauses.push("LOWER(customer_type) = LOWER(?)");
    custParams.push(customerType);
  }
  const customers = db.prepare(
    `SELECT id, name, contact_number, primary_address as address, customer_type FROM customers WHERE ${custClauses.join(" AND ")} LIMIT 20`
  ).all(...custParams);

  const products = db.prepare(
    "SELECT id, name, category, price, stock as stock_qty FROM products WHERE LOWER(name) LIKE ? OR LOWER(category) LIKE ? LIMIT 20"
  ).all(like, like);

  const ordClauses = ["(LOWER(order_number) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(delivery_address) LIKE ? OR LOWER(barangay) LIKE ?)"];
  const ordParams = [like, like, like, like];
  if (status && status !== "All") {
    ordClauses.push("status = ?");
    ordParams.push(status);
  }
  if (date) {
    ordClauses.push("date = ?");
    ordParams.push(date);
  }
  if (customerType && customerType !== "All") {
    ordClauses.push("customer_id IN (SELECT id FROM customers WHERE LOWER(customer_type) = LOWER(?))");
    ordParams.push(customerType);
  }
  const orders = db.prepare(
    `SELECT id, order_number as order_no, customer_name, order_type, total_amount, payment_status, status FROM orders WHERE ${ordClauses.join(" AND ")} ORDER BY date DESC, time DESC LIMIT 20`
  ).all(...ordParams);

  const saleClauses = ["(LOWER(transaction_number) LIKE ? OR LOWER(customer_name) LIKE ?)"];
  const saleParams = [like, like];
  if (date) {
    saleClauses.push("date = ?");
    saleParams.push(date);
  }
  if (customerType && customerType !== "All") {
    saleClauses.push("LOWER(customer_type) = LOWER(?)");
    saleParams.push(customerType);
  }
  const sales = db.prepare(
    `SELECT id, transaction_number as receipt_no, customer_name, total_amount, (date || ' ' || time) as created_at, payment_status as status FROM sales WHERE ${saleClauses.join(" AND ")} ORDER BY date DESC, time DESC LIMIT 20`
  ).all(...saleParams);

  const delClauses = [
    "order_type = 'Delivery'",
    "(LOWER(order_number) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(delivery_address) LIKE ? OR LOWER(barangay) LIKE ? OR LOWER(COALESCE(assigned_personnel, '')) LIKE ?)"
  ];
  const delParams = [like, like, like, like, like];
  if (status && status !== "All") {
    delClauses.push("status = ?");
    delParams.push(status);
  }
  if (date) {
    delClauses.push("date = ?");
    delParams.push(date);
  }
  const deliveries = db.prepare(
    `SELECT id, ('DEL-' || REPLACE(order_number, 'ORD-', '')) as delivery_no, customer_name, delivery_address as address, barangay, COALESCE(assigned_personnel, 'Unassigned') as assigned_personnel, status FROM orders WHERE ${delClauses.join(" AND ")} ORDER BY date DESC, time DESC LIMIT 20`
  ).all(...delParams);

  res.json({ customers, products, orders, sales, deliveries });
});

app.get("/api/staff/overview", requireAuth, (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as tot FROM sales WHERE date = ?").get(today);
  const openOrders = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status NOT IN ('Delivered', 'Completed', 'Cancelled')").get().cnt;
  const activeDeliveries = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE order_type = 'Delivery' AND status IN ('Pending', 'Preparing', 'Out for Delivery')").get().cnt;
  const unreturnedContainers = db.prepare("SELECT COALESCE(SUM(quantity), 0) as cnt FROM containers WHERE action_type = 'borrowed' AND status = 'Open'").get().cnt;
  const lowStockItems = db.prepare(
    "SELECT id, name, category, unit, stock as stock_qty, min_stock as min_stock_level FROM products WHERE stock <= min_stock ORDER BY stock ASC, name ASC"
  ).all();

  res.json({
    todaySalesTotal: todaySales.tot,
    todaySalesCount: todaySales.cnt,
    openOrdersCount: openOrders,
    activeDeliveriesCount: activeDeliveries,
    unreturnedContainersCount: unreturnedContainers,
    lowStockItems
  });
});

// -------------------------------------------------------------
// Vite Dev Server Mount
// -------------------------------------------------------------
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);

  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(process.cwd(), "index.html"));
  });

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aqua Fabz Server running on port ${PORT} (aligned with Capstone ERD)`);
  });
}

startServer();
