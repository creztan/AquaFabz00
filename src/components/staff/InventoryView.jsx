import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, CheckCircle2, RefreshCw, Search } from "lucide-react";
import { apiFetch, formatDate, formatDateTime } from "../../lib/api";
const InventoryView = ({ canEdit }) => {
  const [products, setProducts] = useState([]);
  const [machines, setMachines] = useState([]);
  const [movements, setMovements] = useState([]);
  const [query, setQuery] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [movementType, setMovementType] = useState("stock_in");
  const [productId, setProductId] = useState("");
  const [vendingMachineId, setVendingMachineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [movementDate, setMovementDate] = useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const loadAll = async () => {
    const [prodRes, moveRes] = await Promise.all([
      apiFetch("/api/products"),
      apiFetch("/api/stock-movements")
    ]);
    const active = prodRes.products.filter((p) => p.status === "active");
    setProducts(active);
    setMachines(prodRes.vendingMachines);
    setMovements(moveRes.movements);
    if (active.length > 0 && !productId) setProductId(String(active[0].id));
    if (prodRes.vendingMachines.length > 0 && !vendingMachineId) {
      setVendingMachineId(String(prodRes.vendingMachines[0].id));
    }
  };
  useEffect(() => {
    loadAll();
  }, []);
  const handleSubmitMovement = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch(
        "/api/inventory/move",
        {
          method: "POST",
          body: JSON.stringify({
            product_id: String(productId),
            movement_type: movementType,
            quantity: Number(quantity),
            vending_machine_id: movementType === "vending_restock" ? String(vendingMachineId) : null,
            movement_date: movementDate,
            reason
          })
        }
      );
      setSuccess(
        `Updated "${res.product.name}" stock to ${res.product.stock_qty} ${res.product.unit}.${res.lowStock ? " Item is flagged as Low Stock." : ""}`
      );
      setQuantity("");
      setReason("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update stock.");
    }
  };
  const filteredProducts = products.filter((p) => {
    const matchSearch = !query.trim() || p.name.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase());
    const matchLow = !lowStockOnly || p.stock_qty <= p.min_stock_level;
    return matchSearch && matchLow;
  });
  return <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          {canEdit ? "Inventory Monitoring & Stock-In / Stock-Out" : "Inventory & Low-Stock Monitoring"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor quantities on hand for water containers, caps, bottles, supplies, and vending machines. Items at or below minimum level are automatically flagged.
        </p>
      </div>

      {
    /* Vending Machine Stock Cards */
  }
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {machines.map((m) => {
    const isLow = m.stock_qty <= m.min_stock_level;
    return <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-900">{m.name}</div>
                  <div className="text-[11px] text-slate-500">{m.location_name}</div>
                </div>
                {m.status === "maintenance" ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> On Maintenance
                  </span> : isLow ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
                  </span> : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Normal
                  </span>}
              </div>
              <div className="mt-2 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {m.stock_qty} gal{" "}
                <span className="text-xs font-normal text-slate-500">
                  / min {m.min_stock_level}
                </span>
              </div>
            </div>;
  })}
      </div>

      {
    /* UC18 Staff Stock-In / Stock-Out / Adjustment Panel */
  }
      {canEdit && <form
    onSubmit={handleSubmitMovement}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
          <h2 className="text-sm font-semibold text-slate-900">
            Record Stock-In, Stock-Out, Vending Restock, or Count Adjustment
          </h2>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>}
          {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
              {success}
            </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Movement Type
              </label>
              <select
    value={movementType}
    onChange={(e) => setMovementType(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                <option value="stock_in">Stock-In (Purchased / Added)</option>
                <option value="stock_out">Stock-Out (Used / Damaged)</option>
                <option value="vending_restock">Restock Vending Machine</option>
                <option value="adjustment">Physical Count Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product / Supply
              </label>
              <select
    value={productId}
    onChange={(e) => setProductId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                {products.map((p) => <option key={p.id} value={p.id}>
                    {p.name} (On hand: {p.stock_qty})
                  </option>)}
              </select>
            </div>

            {movementType === "vending_restock" && <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Vending Machine
                </label>
                <select
    value={vendingMachineId}
    onChange={(e) => setVendingMachineId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                  {machines.map((m) => <option key={m.id} value={m.id}>
                      {m.name}{m.status === "maintenance" ? " (On Maintenance)" : ""}
                    </option>)}
                </select>
              </div>}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {movementType === "adjustment" ? "New Physical Count" : "Quantity"}
              </label>
              <input
    type="number"
    min={movementType === "adjustment" ? "0" : "1"}
    required
    value={quantity}
    onChange={(e) => setQuantity(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date
              </label>
              <input
    type="date"
    required
    value={movementDate}
    onChange={(e) => setMovementDate(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Reference{" "}
                {movementType === "adjustment" ? "(Required for Adjustment)" : "(Optional)"}
              </label>
              <input
    type="text"
    required={movementType === "adjustment"}
    value={reason}
    onChange={(e) => setReason(e.target.value)}
    placeholder={movementType === "adjustment" ? "Explain discrepancy after physical inventory check" : "e.g. Supplier delivery receipt or damaged unit"}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>
            <button
    type="submit"
    className="rounded-lg bg-sky-600 px-5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
              Save Stock Update
            </button>
          </div>
        </form>}

      {
    /* Search & Filter */
  }
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
    type="text"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Search products, containers, caps, supplies..."
    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs"
  />
        </div>
        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 cursor-pointer">
          <input
    type="checkbox"
    checked={lowStockOnly}
    onChange={(e) => setLowStockOnly(e.target.checked)}
    className="rounded border-slate-300 text-sky-600"
  />
          Show Low-Stock Alerts Only
        </label>
      </div>

      {
    /* Inventory Table */
  }
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {filteredProducts.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">
            No inventory items match your search or filter.
          </div> : <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Item Name</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-5 py-3 text-right font-semibold">Quantity On Hand</th>
                  <th className="px-5 py-3 text-right font-semibold">Minimum Level</th>
                  <th className="px-5 py-3 font-semibold">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
    const isLow = p.stock_qty <= p.min_stock_level;
    return <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-5 py-3 text-slate-600">{p.category}</td>
                      <td className="px-5 py-3 text-slate-600">{p.unit}</td>
                      <td
      className={`px-5 py-3 text-right font-mono font-bold tabular-nums ${isLow ? "text-red-700" : "text-slate-900"}`}
    >
                        {p.stock_qty}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-slate-600 tabular-nums">
                        {p.min_stock_level}
                      </td>
                      <td className="px-5 py-3">
                        {isLow ? <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Low Stock — Replenish
                          </span> : <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Normal
                          </span>}
                      </td>
                    </tr>;
  })}
              </tbody>
            </table>
          </div>}
      </div>

      {
    /* Stock Movement Log */
  }
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Recent Stock Movements ({movements.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Movement</th>
                <th className="px-4 py-3 text-right font-semibold">Change</th>
                <th className="px-4 py-3 text-right font-semibold">New Qty</th>
                <th className="px-4 py-3 font-semibold">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.slice(0, 25).map((m) => <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                    {formatDate(m.movement_date)} · {formatDateTime(m.created_at).split(",")[1]}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{m.product_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 text-slate-700">
                      {m.quantity_change > 0 ? <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-600" /> : m.movement_type === "adjustment" ? <RefreshCw className="h-3.5 w-3.5 text-amber-600" /> : <ArrowDownCircle className="h-3.5 w-3.5 text-red-600" />}
                      {m.movement_type.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td
    className={`px-4 py-2.5 text-right font-mono font-semibold tabular-nums ${m.quantity_change > 0 ? "text-emerald-700" : "text-red-700"}`}
  >
                    {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{m.new_qty}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {m.reason}
                    {m.vending_machine_name ? ` (${m.vending_machine_name})` : ""}
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>;
};
export {
  InventoryView
};
