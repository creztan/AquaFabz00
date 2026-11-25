<?php
declare(strict_types=1);

session_start();

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'aqua_fabz_db');
define('DB_USER', 'root');
define('DB_PASS', '');

function getPDO(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function jsonResponse(array $payload, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload);
    exit;
}

function logActivity(PDO $pdo, ?int $userId, string $username, string $role, string $action, string $description): void {
    $stmt = $pdo->prepare(
        'INSERT INTO activity_logs (user_id, username, user_role, action_type, description) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$userId, $username, $role, $action, $description]);
}

function requireAuth(): array {
    if (empty($_SESSION['user'])) {
        jsonResponse(['error' => 'Authentication required. Please log in.'], 401);
    }
    return $_SESSION['user'];
}

function requireRole(string $role): array {
    $user = requireAuth();
    if ($user['role'] !== $role) {
        jsonResponse(['error' => "Access denied. Restricted to {$role}."], 403);
    }
    return $user;
}
