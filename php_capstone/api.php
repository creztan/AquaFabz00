<?php
declare(strict_types=1);

require_once __DIR__ . '/config/db.php';

$pdo = getPDO();
$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input') ?: '{}', true) ?? [];

switch ($action) {
    case 'login':
        if ($method !== 'POST') jsonResponse(['error' => 'Method not allowed'], 405);
        $username = trim((string)($input['username'] ?? ''));
        $password = (string)($input['password'] ?? '');
        $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) jsonResponse(['error' => 'Invalid username or password.'], 401);
        if ($user['status'] !== 'active') jsonResponse(['error' => 'Account is deactivated. Contact Administrator.'], 403);
        if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
            jsonResponse(['error' => 'Login temporarily locked due to repeated failed attempts.'], 429);
        }

        if (!password_verify($password, $user['password_hash'])) {
            $attempts = (int)$user['failed_attempts'] + 1;
            $lockUntil = $attempts >= 5 ? date('Y-m-d H:i:s', time() + 60) : null;
            $pdo->prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
                ->execute([$attempts, $lockUntil, $user['id']]);
            logActivity($pdo, (int)$user['id'], $user['username'], $user['role'], 'LOGIN_FAILED', "Failed login attempt ({$attempts}/5)");
            jsonResponse(['error' => 'Invalid username or password.'], 401);
        }

        $pdo->prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?')->execute([$user['id']]);
        unset($user['password_hash']);
        $_SESSION['user'] = $user;
        logActivity($pdo, (int)$user['id'], $user['username'], $user['role'], 'LOGIN', "{$user['role']} logged in");
        jsonResponse(['user' => $user]);
        break;

    case 'logout':
        session_destroy();
        jsonResponse(['ok' => true]);
        break;

    case 'me':
        jsonResponse(['user' => $_SESSION['user'] ?? null]);
        break;

    case 'dashboard':
        requireRole('Administrator');
        $stationSales = (float)$pdo->query("SELECT COALESCE(SUM(total_amount),0) FROM sales WHERE status='completed'")->fetchColumn();
        $vendoSales = (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM vending_sales WHERE status='completed'")->fetchColumn();
        $pendingOrders = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status IN ('Pending','Preparing','Out for Delivery')")->fetchColumn();
        $completedDeliveries = (int)$pdo->query("SELECT COUNT(*) FROM deliveries WHERE status='Delivered'")->fetchColumn();
        $lowStock = $pdo->query("SELECT * FROM products WHERE status='active' AND stock_qty <= min_stock_level")->fetchAll();
        jsonResponse([
            'totalSales' => $stationSales + $vendoSales,
            'stationSalesTotal' => $stationSales,
            'vendingSalesTotal' => $vendoSales,
            'pendingOrdersCount' => $pendingOrders,
            'completedDeliveriesCount' => $completedDeliveries,
            'lowStockProducts' => $lowStock,
        ]);
        break;

    case 'products':
        requireAuth();
        if ($method === 'GET') {
            $products = $pdo->query('SELECT * FROM products ORDER BY name ASC')->fetchAll();
            $machines = $pdo->query('SELECT * FROM vending_machines ORDER BY id ASC')->fetchAll();
            jsonResponse(['products' => $products, 'vendingMachines' => $machines]);
        }
        if ($method === 'POST') {
            $admin = requireRole('Administrator');
            $name = trim((string)($input['name'] ?? ''));
            $category = trim((string)($input['category'] ?? ''));
            $unit = trim((string)($input['unit'] ?? ''));
            $price = (float)($input['price'] ?? 0);
            if (!$name || $price <= 0) jsonResponse(['error' => 'Valid product name and price > 0 required.'], 400);
            $stmt = $pdo->prepare('INSERT INTO products (name, category, unit, price, stock_qty, min_stock_level, is_container) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$name, $category, $unit, $price, (int)($input['stock_qty'] ?? 0), (int)($input['min_stock_level'] ?? 10), !empty($input['is_container']) ? 1 : 0]);
            logActivity($pdo, (int)$admin['id'], $admin['username'], $admin['role'], 'PRODUCT_CREATE', "Created product {$name}");
            jsonResponse(['ok' => true], 201);
        }
        break;

    case 'sales':
        requireAuth();
        if ($method === 'GET') {
            $rows = $pdo->query('SELECT * FROM sales ORDER BY created_at DESC LIMIT 100')->fetchAll();
            jsonResponse(['sales' => $rows]);
        }
        if ($method === 'POST') {
            $staff = requireRole('Staff');
            $items = $input['items'] ?? [];
            if (empty($items)) jsonResponse(['error' => 'Select at least one item.'], 400);
            $pdo->beginTransaction();
            try {
                $total = 0;
                $prepared = [];
                foreach ($items as $it) {
                    $pStmt = $pdo->prepare("SELECT * FROM products WHERE id = ? AND status = 'active' FOR UPDATE");
                    $pStmt->execute([(int)$it['product_id']]);
                    $prod = $pStmt->fetch();
                    $qty = (int)$it['quantity'];
                    if (!$prod || $qty <= 0 || $qty > (int)$prod['stock_qty']) {
                        throw new RuntimeException('Insufficient stock or invalid product.');
                    }
                    $lineTotal = (float)$prod['price'] * $qty;
                    $total += $lineTotal;
                    $prepared[] = [$prod, $qty, $lineTotal];
                }
                $count = (int)$pdo->query('SELECT COUNT(*) FROM sales')->fetchColumn() + 1;
                $receiptNo = sprintf('SL-%s-%04d', date('Y'), $count);
                $pdo->prepare('INSERT INTO sales (receipt_no, customer_name, total_amount, payment_method, recorded_by) VALUES (?, ?, ?, ?, ?)')
                    ->execute([$receiptNo, $input['customer_name'] ?? 'Walk-in Customer', $total, $input['payment_method'] ?? 'Cash', $staff['id']]);
                $saleId = (int)$pdo->lastInsertId();
                foreach ($prepared as [$prod, $qty, $lineTotal]) {
                    $pdo->prepare('INSERT INTO sale_items (sale_id, product_id, product_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)')
                        ->execute([$saleId, $prod['id'], $prod['name'], $prod['price'], $qty, $lineTotal]);
                    $pdo->prepare('UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?')
                        ->execute([$qty, $prod['id']]);
                }
                $pdo->commit();
                jsonResponse(['receipt_no' => $receiptNo, 'total_amount' => $total], 201);
            } catch (Throwable $e) {
                $pdo->rollBack();
                jsonResponse(['error' => $e->getMessage()], 400);
            }
        }
        break;

    case 'vending_sales':
        requireAuth();
        if ($method === 'GET') {
            $rows = $pdo->query('SELECT vs.*, vm.name AS machine_name FROM vending_sales vs JOIN vending_machines vm ON vm.id = vs.machine_id ORDER BY vs.sale_date DESC')->fetchAll();
            jsonResponse(['vendingSales' => $rows]);
        }
        if ($method === 'POST') {
            $staff = requireRole('Staff');
            $stmt = $pdo->prepare('INSERT INTO vending_sales (machine_id, sale_date, amount, notes, recorded_by) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([(int)$input['machine_id'], $input['sale_date'], (float)$input['amount'], $input['notes'] ?? '', $staff['id']]);
            jsonResponse(['ok' => true], 201);
        }
        break;

    case 'deliveries_public':
        $rows = $pdo->query("
            SELECT d.*, o.order_no, c.name AS customer_name, cl.address, cl.barangay, cl.landmark_notes, cl.lat, cl.lng
            FROM deliveries d
            JOIN orders o ON o.id = d.order_id
            JOIN customers c ON c.id = d.customer_id
            JOIN customer_locations cl ON cl.id = d.delivery_location_id
            ORDER BY d.scheduled_datetime ASC
        ")->fetchAll();
        jsonResponse(['deliveries' => $rows]);
        break;

    default:
        jsonResponse(['error' => 'Unknown API action'], 404);
}
