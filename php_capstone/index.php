<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Aqua Fabz Water Refilling Station Management System (PHP)</title>
  <link rel="stylesheet" href="assets/css/style.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</head>
<body>
  <div id="app">
    <div id="login-screen" class="login-shell">
      <div class="login-card">
        <h1>Aqua Fabz Water Refilling Station</h1>
        <p class="subtitle">Sales, Inventory, Customer &amp; Location Mapping Management System</p>
        <div id="login-error" class="alert hidden"></div>
        <form id="login-form">
          <label for="username">Username</label>
          <input id="username" type="text" required placeholder="admin or staff" />
          <label for="password">Password</label>
          <input id="password" type="password" required placeholder="Enter password" />
          <button type="submit" class="btn-primary">Log In</button>
        </form>
        <button id="btn-delivery-ref" type="button" class="btn-secondary">
          Delivery Personnel Location Reference (No Login)
        </button>
      </div>
    </div>

    <div id="workspace" class="workspace hidden">
      <aside class="sidebar">
        <div class="brand">Aqua Fabz Station</div>
        <nav id="role-nav"></nav>
        <div class="sidebar-footer">
          <div id="user-badge"></div>
          <button id="btn-logout" type="button" class="btn-secondary">Log Out</button>
        </div>
      </aside>
      <main class="main-panel">
        <header class="topbar">
          <span id="page-title">Dashboard</span>
        </header>
        <section id="view-container" class="content"></section>
      </main>
    </div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>
