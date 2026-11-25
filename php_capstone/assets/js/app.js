(function () {
  const loginScreen = document.getElementById('login-screen');
  const workspace = document.getElementById('workspace');
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  const roleNav = document.getElementById('role-nav');
  const viewContainer = document.getElementById('view-container');
  const pageTitle = document.getElementById('page-title');
  const userBadge = document.getElementById('user-badge');

  let currentUser = null;

  async function api(action, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`api.php?action=${encodeURIComponent(action)}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function renderNav() {
    const items =
      currentUser.role === 'Administrator'
        ? [
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'products', label: 'Products & Prices' },
          ]
        : [
            { id: 'sales', label: 'Record Sale (POS)' },
            { id: 'vending', label: 'Vending Machine Sales' },
            { id: 'delivery_ref', label: 'Delivery Map Reference' },
          ];

    roleNav.innerHTML = '';
    items.forEach((it, idx) => {
      const btn = document.createElement('button');
      btn.textContent = it.label;
      if (idx === 0) btn.classList.add('active');
      btn.addEventListener('click', () => {
        roleNav.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        loadTab(it.id, it.label);
      });
      roleNav.appendChild(btn);
    });

    if (items.length > 0) loadTab(items[0].id, items[0].label);
  }

  async function loadTab(tabId, label) {
    pageTitle.textContent = label;
    if (tabId === 'dashboard') {
      const d = await api('dashboard');
      viewContainer.innerHTML = `
        <div class="grid-3">
          <div class="card"><div>Total Sales</div><h2>₱${Number(d.totalSales).toFixed(2)}</h2></div>
          <div class="card"><div>Pending Orders</div><h2>${d.pendingOrdersCount}</h2></div>
          <div class="card"><div>Completed Deliveries</div><h2>${d.completedDeliveriesCount}</h2></div>
        </div>
        <div class="card">
          <h3>Low-Stock Products (${d.lowStockProducts.length})</h3>
          <table><thead><tr><th>Name</th><th>Stock</th><th>Min Level</th></tr></thead><tbody>
          ${d.lowStockProducts.map((p) => `<tr><td>${p.name}</td><td>${p.stock_qty}</td><td>${p.min_stock_level}</td></tr>`).join('')}
          </tbody></table>
        </div>
      `;
    } else if (tabId === 'products') {
      const res = await api('products');
      viewContainer.innerHTML = `
        <div class="card">
          <h3>Product Catalog</h3>
          <table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th></tr></thead><tbody>
          ${res.products.map((p) => `<tr><td>${p.name}</td><td>${p.category}</td><td>₱${Number(p.price).toFixed(2)}</td><td>${p.stock_qty}</td></tr>`).join('')}
          </tbody></table>
        </div>
      `;
    } else if (tabId === 'sales') {
      const res = await api('sales');
      viewContainer.innerHTML = `
        <div class="card">
          <h3>Recent Sales Transactions</h3>
          <table><thead><tr><th>Receipt #</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>
          ${res.sales.map((s) => `<tr><td>${s.receipt_no}</td><td>${s.customer_name}</td><td>₱${Number(s.total_amount).toFixed(2)}</td><td>${s.status}</td></tr>`).join('')}
          </tbody></table>
        </div>
      `;
    } else if (tabId === 'vending') {
      const res = await api('vending_sales');
      viewContainer.innerHTML = `
        <div class="card">
          <h3>Vending Machine Sales</h3>
          <table><thead><tr><th>Machine</th><th>Date</th><th>Amount</th></tr></thead><tbody>
          ${res.vendingSales.map((v) => `<tr><td>${v.machine_name}</td><td>${v.sale_date}</td><td>₱${Number(v.amount).toFixed(2)}</td></tr>`).join('')}
          </tbody></table>
        </div>
      `;
    } else if (tabId === 'delivery_ref') {
      const res = await api('deliveries_public');
      viewContainer.innerHTML = `
        <div class="card">
          <h3>Delivery Schedule &amp; Map Reference</h3>
          <div id="php-map" style="height:360px;margin-bottom:16px;border-radius:8px;"></div>
          <table><thead><tr><th>Delivery #</th><th>Customer</th><th>Address</th><th>Personnel</th><th>Status</th></tr></thead><tbody>
          ${res.deliveries.map((d) => `<tr><td>${d.delivery_no}</td><td>${d.customer_name}</td><td>${d.address}</td><td>${d.assigned_personnel}</td><td>${d.status}</td></tr>`).join('')}
          </tbody></table>
        </div>
      `;
      if (window.L) {
        const map = L.map('php-map').setView([10.1935, 122.8586], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        res.deliveries.forEach((d) => {
          L.marker([d.lat, d.lng]).addTo(map).bindPopup(`${d.customer_name}: ${d.address}`);
        });
      }
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    try {
      const res = await api('login', 'POST', {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      });
      currentUser = res.user;
      loginScreen.classList.add('hidden');
      workspace.classList.remove('hidden');
      userBadge.textContent = `${currentUser.name} (${currentUser.role})`;
      renderNav();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.classList.remove('hidden');
    }
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    await api('logout', 'POST');
    currentUser = null;
    workspace.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });

  document.getElementById('btn-delivery-ref').addEventListener('click', () => {
    loginScreen.classList.add('hidden');
    workspace.classList.remove('hidden');
    roleNav.innerHTML = '';
    userBadge.textContent = 'Delivery Personnel (View-Only)';
    loadTab('delivery_ref', 'Delivery Location Reference');
  });
})();
