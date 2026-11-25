import { useEffect, useState } from "react";
import { Edit2, Plus, Power } from "lucide-react";
import { apiFetch, formatCurrency } from "../../lib/api";
const CATEGORIES = [
  "Purified Water",
  "Mineral Water",
  "Water Container",
  "Caps & Seals",
  "Bottles",
  "Station Supplies"
];
const ProductsManagement = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Purified Water");
  const [unit, setUnit] = useState("5-gal refill");
  const [price, setPrice] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [minLevel, setMinLevel] = useState("10");
  const [isContainer, setIsContainer] = useState(false);
  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/products");
      setProducts(res.products);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadProducts();
  }, []);
  const openAdd = () => {
    setEditing(null);
    setName("");
    setCategory("Purified Water");
    setUnit("5-gal refill");
    setPrice("");
    setStockQty("0");
    setMinLevel("10");
    setIsContainer(false);
    setError("");
    setShowForm(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setPrice(String(p.price));
    setStockQty(String(p.stock_qty));
    setMinLevel(String(p.min_stock_level));
    setIsContainer(p.is_container === 1);
    setError("");
    setShowForm(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const numPrice = Number(price);
    if (Number.isNaN(numPrice) || numPrice <= 0) {
      setError("Price must be a valid number greater than zero.");
      return;
    }
    try {
      if (editing) {
        await apiFetch(`/api/products/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            category,
            unit,
            price: numPrice,
            min_stock_level: Number(minLevel),
            is_container: isContainer
          })
        });
        setSuccess(`Updated "${name}". Past transactions retain their original prices.`);
      } else {
        await apiFetch("/api/products", {
          method: "POST",
          body: JSON.stringify({
            name,
            category,
            unit,
            price: numPrice,
            stock_qty: Number(stockQty),
            min_stock_level: Number(minLevel),
            is_container: isContainer
          })
        });
        setSuccess(`Added product "${name}" to catalog.`);
      }
      setShowForm(false);
      loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save product.");
    }
  };
  const toggleStatus = async (p) => {
    const nextStatus = p.status === "active" ? "inactive" : "active";
    await apiFetch(`/api/products/${p.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus })
    });
    setSuccess(`Marked "${p.name}" as ${nextStatus}.`);
    loadProducts();
  };
  return <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Products & Pricing Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Maintain water products, containers, caps, bottles, and supplies. Price updates are logged and never alter historical transactions.
          </p>
        </div>
        <button
    type="button"
    onClick={openAdd}
    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
  >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {success}
        </div>}

      {showForm && <form
    onSubmit={handleSubmit}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {editing ? `Edit Product & Price \u2014 ${editing.name}` : "Add New Product"}
            </h2>
            <button
    type="button"
    onClick={() => setShowForm(false)}
    className="text-xs text-slate-500 hover:text-slate-800"
  >
              Cancel
            </button>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Name
              </label>
              <input
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
    placeholder="e.g. Alkaline Water Refill (5-Gal)"
  />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                {CATEGORIES.map((c) => <option key={c} value={c}>
                    {c}
                  </option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit
              </label>
              <input
    type="text"
    required
    value={unit}
    onChange={(e) => setUnit(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
    placeholder="e.g. 5-gal refill, piece, pack"
  />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unit Price (₱)
              </label>
              <input
    type="number"
    step="0.01"
    min="0.01"
    required
    value={price}
    onChange={(e) => setPrice(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
    placeholder="25.00"
  />
            </div>

            {!editing && <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Stock Quantity
                </label>
                <input
    type="number"
    min="0"
    required
    value={stockQty}
    onChange={(e) => setStockQty(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
              </div>}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimum Stock Alert Level
              </label>
              <input
    type="number"
    min="0"
    required
    value={minLevel}
    onChange={(e) => setMinLevel(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
    type="checkbox"
    checked={isContainer}
    onChange={(e) => setIsContainer(e.target.checked)}
    className="rounded border-slate-300 text-sky-600"
  />
            Track as borrowable water container
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
    type="button"
    onClick={() => setShowForm(false)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
              Cancel
            </button>
            <button
    type="submit"
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
              {editing ? "Save Product & Price" : "Create Product"}
            </button>
          </div>
        </form>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading products...</div> : <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product Name</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-5 py-3 text-right font-semibold">Price</th>
                  <th className="px-5 py-3 text-right font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => <tr
    key={p.id}
    className={p.status === "inactive" ? "bg-slate-50/70 text-slate-400" : "hover:bg-slate-50"}
  >
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {p.name}
                      {p.is_container === 1 && <span className="ml-2 text-[11px] font-normal text-slate-500">
                          · Container
                        </span>}
                    </td>
                    <td className="px-5 py-3">{p.category}</td>
                    <td className="px-5 py-3">{p.unit}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(p.price)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{p.stock_qty}</td>
                    <td className="px-5 py-3">
                      <span
    className={`font-semibold ${p.status === "active" ? "text-emerald-700" : "text-slate-500"}`}
  >
                        {p.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
    type="button"
    onClick={() => openEdit(p)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
  >
                          <Edit2 className="h-3 w-3" /> Edit / Price
                        </button>
                        <button
    type="button"
    onClick={() => toggleStatus(p)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
  >
                          <Power className="h-3 w-3" />
                          {p.status === "active" ? "Mark Inactive" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </div>
    </div>;
};
export {
  ProductsManagement
};
