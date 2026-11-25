import { useEffect, useState } from "react";
import { CheckCircle2, Droplets, Plus, RotateCcw } from "lucide-react";
import { apiFetch, formatDateTime } from "../../lib/api";
const ContainersView = ({ initialCustomerId = null }) => {
  const [containerProducts, setContainerProducts] = useState([]);
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showNew, setShowNew] = useState(Boolean(initialCustomerId));
  const [customerId, setCustomerId] = useState(
    initialCustomerId ? String(initialCustomerId) : ""
  );
  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(String(initialCustomerId));
      setShowNew(true);
    }
  }, [initialCustomerId]);
  const [productId, setProductId] = useState("");
  const [recordType, setRecordType] = useState("borrowed");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnedGood, setReturnedGood] = useState("1");
  const [returnedDamaged, setReturnedDamaged] = useState("0");
  const [returnNotes, setReturnNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const loadAll = async () => {
    const [contRes, custRes] = await Promise.all([
      apiFetch("/api/containers"),
      apiFetch("/api/customers")
    ]);
    setContainerProducts(contRes.containerProducts);
    setRecords(contRes.records);
    setCustomers(custRes.customers);
    if (contRes.containerProducts.length > 0 && !productId) {
      setProductId(String(contRes.containerProducts[0].id));
    }
    if (custRes.customers.length > 0 && !customerId) {
      setCustomerId(String(custRes.customers[0].id));
    }
  };
  useEffect(() => {
    loadAll();
  }, []);
  const totalAvailable = containerProducts.reduce((a, p) => a + p.stock_qty, 0);
  const totalUnreturned = records.filter((r) => r.record_type === "borrowed" && r.status === "Open").reduce((a, r) => a + (r.qty_borrowed - r.qty_returned - r.qty_damaged), 0);
  const totalDamaged = records.reduce((a, r) => a + r.qty_damaged, 0);
  const totalCustomerOwned = records.filter((r) => r.record_type === "customer_owned").reduce((a, r) => a + r.qty_borrowed, 0);
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/containers", {
        method: "POST",
        body: JSON.stringify({
          customer_id: String(customerId),
          product_id: String(productId),
          record_type: recordType,
          quantity: Number(quantity),
          notes
        })
      });
      setSuccess(
        recordType === "borrowed" ? "Recorded borrowed containers and updated available station count." : "Recorded customer-owned container for refilling without altering station stock."
      );
      setShowNew(false);
      setQuantity("1");
      setNotes("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save container record.");
    }
  };
  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnTarget) return;
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/containers/${returnTarget.id}/return`, {
        method: "POST",
        body: JSON.stringify({
          returned_good: Number(returnedGood),
          returned_damaged: Number(returnedDamaged),
          notes: returnNotes
        })
      });
      setSuccess("Container return recorded. Good containers added back to available stock; damaged listed separately.");
      setReturnTarget(null);
      setReturnNotes("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to process return.");
    }
  };
  const filteredRecords = records.filter((r) => {
    if (filter === "unreturned") return r.record_type === "borrowed" && r.status === "Open";
    if (filter === "damaged") return r.qty_damaged > 0;
    if (filter === "customer_owned") return r.record_type === "customer_owned";
    return true;
  });
  return <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Water Container Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track available, borrowed, partially returned, damaged, and customer-owned containers.
          </p>
        </div>
        <button
    type="button"
    onClick={() => {
      setShowNew(true);
      setError("");
    }}
    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
  >
          <Plus className="h-4 w-4" /> Record Container Movement
        </button>
      </div>

      {
    /* Container Summary Counts */
  }
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Available Station Containers</div>
          <div className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {totalAvailable}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {containerProducts.map((p) => `${p.name.split(" ")[1]}: ${p.stock_qty}`).join(" \xB7 ")}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Currently Borrowed (Unreturned)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {totalUnreturned}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Damaged Containers</div>
          <div className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
            {totalDamaged}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Customer-Owned (For Refill)</div>
          <div className="mt-1 font-mono text-2xl font-bold text-sky-700 tabular-nums">
            {totalCustomerOwned}
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {success}
        </div>}

      {showNew && <form
    onSubmit={handleCreateRecord}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Record Borrowed or Customer-Owned Container
            </h2>
            <button
    type="button"
    onClick={() => setShowNew(false)}
    className="text-xs text-slate-500"
  >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Record Type
              </label>
              <select
    value={recordType}
    onChange={(e) => setRecordType(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                <option value="borrowed">Station Container Borrowed</option>
                <option value="customer_owned">Customer-Owned (Refill Only)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer
              </label>
              <select
    value={customerId}
    onChange={(e) => setCustomerId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                {customers.map((c) => <option key={c.id} value={c.id}>
                    {c.name}
                  </option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Container Type
              </label>
              <select
    value={productId}
    onChange={(e) => setProductId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                {containerProducts.map((p) => <option key={p.id} value={p.id}>
                    {p.name} (Avail: {p.stock_qty})
                  </option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity
              </label>
              <input
    type="number"
    min="1"
    required
    value={quantity}
    onChange={(e) => setQuantity(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
    type="text"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="e.g. Color/markings or return promise date"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
          </div>
          <div className="flex justify-end gap-2">
            <button
    type="button"
    onClick={() => setShowNew(false)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium"
  >
              Cancel
            </button>
            <button
    type="submit"
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white"
  >
              Save Record
            </button>
          </div>
        </form>}

      {
    /* Filter Tabs */
  }
      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {[
    { id: "all", label: "All Records" },
    { id: "unreturned", label: "Unreturned Borrowed" },
    { id: "damaged", label: "Damaged List" },
    { id: "customer_owned", label: "Customer-Owned" }
  ].map((tab) => <button
    key={tab.id}
    type="button"
    onClick={() => setFilter(tab.id)}
    className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
  >
            {tab.label}
          </button>)}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Container Type</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                <th className="px-4 py-3 text-right font-semibold">Returned</th>
                <th className="px-4 py-3 text-right font-semibold">Damaged</th>
                <th className="px-4 py-3 text-right font-semibold">Remaining</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => {
    const remaining = r.record_type === "borrowed" ? r.qty_borrowed - r.qty_returned - r.qty_damaged : 0;
    return <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.customer_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatDateTime(r.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{r.product_name}</td>
                    <td className="px-4 py-3">
                      {r.record_type === "borrowed" ? "Borrowed" : "Customer-Owned"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.qty_borrowed}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.qty_returned}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-700 tabular-nums">
                      {r.qty_damaged}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                      {remaining}
                    </td>
                    <td className="px-4 py-3">
                      <span
      className={`inline-flex items-center gap-1 font-semibold ${r.status === "Open" ? "text-amber-700" : r.status === "Closed" ? "text-emerald-700" : "text-sky-700"}`}
    >
                        {r.status === "Closed" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {r.status === "Customer-Owned" && <Droplets className="h-3.5 w-3.5" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.record_type === "borrowed" && r.status === "Open" && <button
      type="button"
      onClick={() => {
        setReturnTarget(r);
        setReturnedGood(String(remaining));
        setReturnedDamaged("0");
        setReturnNotes("");
      }}
      className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
    >
                          <RotateCcw className="h-3 w-3" /> Return / Damaged
                        </button>}
                    </td>
                  </tr>;
  })}
            </tbody>
          </table>
        </div>
      </div>

      {returnTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleReturnSubmit}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Process Container Return — {returnTarget.customer_name}
            </h3>
            <p className="text-xs text-slate-600">
              {returnTarget.product_name} · Remaining unreturned:{" "}
              <strong>
                {returnTarget.qty_borrowed - returnTarget.qty_returned - returnTarget.qty_damaged}
              </strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Returned Good
                </label>
                <input
    type="number"
    min="0"
    required
    value={returnedGood}
    onChange={(e) => setReturnedGood(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marked Damaged
                </label>
                <input
    type="number"
    min="0"
    required
    value={returnedDamaged}
    onChange={(e) => setReturnedDamaged(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <input
    type="text"
    value={returnNotes}
    onChange={(e) => setReturnNotes(e.target.value)}
    placeholder="e.g. Partial return or cracked bottle neck"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setReturnTarget(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium"
  >
                Cancel
              </button>
              <button
    type="submit"
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white"
  >
                Confirm Return
              </button>
            </div>
          </form>
        </div>}
    </div>;
};
export {
  ContainersView
};
