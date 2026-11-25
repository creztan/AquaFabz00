import { useEffect, useState } from "react";
import { Ban, Edit3, Plus, Printer, Trash2, UserPlus } from "lucide-react";
import { apiFetch, formatCurrency, formatDateTime } from "../../lib/api";
import { ReceiptModal } from "../ReceiptModal";
import { QuickCustomerModal } from "./QuickCustomerModal";
const SalesPOS = ({ initialCustomerId = null }) => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [customerId, setCustomerId] = useState(
    initialCustomerId ? String(initialCustomerId) : ""
  );
  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(String(initialCustomerId));
    }
  }, [initialCustomerId]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [cart, setCart] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qtyInput, setQtyInput] = useState("1");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [correctTarget, setCorrectTarget] = useState(null);
  const [correctReason, setCorrectReason] = useState("");
  const [correctingRef, setCorrectingRef] = useState("");
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const loadAll = async () => {
    const [prodRes, custRes, saleRes] = await Promise.all([
      apiFetch("/api/products"),
      apiFetch("/api/customers"),
      apiFetch("/api/sales")
    ]);
    const active = prodRes.products.filter((p) => p.status === "active");
    setProducts(active);
    if (active.length > 0 && !selectedProductId) {
      setSelectedProductId(String(active[0].id));
    }
    setCustomers(custRes.customers);
    setSales(saleRes.sales);
  };
  useEffect(() => {
    loadAll();
  }, []);
  const addToCart = () => {
    setError("");
    const pid = String(selectedProductId);
    const qty = Number(qtyInput);
    const prod = products.find((p) => String(p.id) === pid);
    if (!prod) return;
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    const existing = cart.find((c) => c.product_id === pid);
    const nextQty = (existing?.quantity || 0) + qty;
    if (nextQty > prod.stock_qty) {
      setError(
        `Insufficient stock for "${prod.name}". Requested ${nextQty}, available ${prod.stock_qty}.`
      );
      return;
    }
    if (existing) {
      setCart(
        cart.map((c) => c.product_id === pid ? { ...c, quantity: nextQty } : c)
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: prod.id,
          product_name: prod.name,
          unit_price: prod.price,
          max_stock: prod.stock_qty,
          quantity: qty
        }
      ]);
    }
    setQtyInput("1");
  };
  const updateCartQty = (pid, newQty) => {
    const line = cart.find((c) => c.product_id === pid);
    if (!line) return;
    if (newQty <= 0) {
      setCart(cart.filter((c) => c.product_id !== pid));
      return;
    }
    if (newQty > line.max_stock) {
      setError(`Insufficient stock for "${line.product_name}" (available: ${line.max_stock}).`);
      return;
    }
    setError("");
    setCart(cart.map((c) => c.product_id === pid ? { ...c, quantity: newQty } : c));
  };
  const grandTotal = cart.reduce((acc, c) => acc + c.unit_price * c.quantity, 0);
  const handleConfirmSale = async () => {
    setError("");
    setSuccess("");
    if (cart.length === 0) {
      setError("Add at least one product before confirming the sale.");
      return;
    }
    try {
      const res = await apiFetch("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          customer_id: customerId ? String(customerId) : null,
          payment_method: paymentMethod,
          items: cart.map((c) => ({ product_id: c.product_id, quantity: c.quantity }))
        })
      });
      setCart([]);
      setCustomerId("");
      setCorrectingRef("");
      setSuccess(`Recorded sale ${res.sale.receipt_no} (${formatCurrency(res.sale.total_amount)}).`);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record sale.");
    }
  };
  const handlePrintSale = async (sale) => {
    const res = await apiFetch(
      `/api/print/sale/${sale.id}`,
      { method: "POST" }
    );
    setReceipt({
      kind: "sale",
      referenceNo: sale.receipt_no,
      date: sale.created_at,
      customerName: sale.customer_name,
      paymentMethod: sale.payment_method,
      items: sale.items,
      totalAmount: sale.total_amount,
      isReprint: res.isReprint,
      printCount: res.printCount
    });
    loadAll();
  };
  const handleVoidSale = async (e) => {
    e.preventDefault();
    if (!voidTarget) return;
    try {
      await apiFetch(`/api/sales/${voidTarget.id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: voidReason })
      });
      setSuccess(`Voided sale ${voidTarget.receipt_no} and restored stock.`);
      setVoidTarget(null);
      setVoidReason("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not void sale.");
    }
  };
  const handleCorrectSale = async (e) => {
    e.preventDefault();
    if (!correctTarget) return;
    try {
      await apiFetch(`/api/sales/${correctTarget.id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: `Correction: ${correctReason}` })
      });
      const [prodRes, custRes, saleRes] = await Promise.all([
        apiFetch("/api/products"),
        apiFetch("/api/customers"),
        apiFetch("/api/sales")
      ]);
      const active = prodRes.products.filter((p) => p.status === "active");
      setProducts(active);
      setCustomers(custRes.customers);
      setSales(saleRes.sales);
      setCustomerId(correctTarget.customer_id ? String(correctTarget.customer_id) : "");
      setPaymentMethod(correctTarget.payment_method || "Cash");
      const restoredCart = [];
      for (const item of correctTarget.items || []) {
        const prod = active.find((p) => p.id === item.product_id);
        if (prod && prod.stock_qty > 0) {
          restoredCart.push({
            product_id: prod.id,
            product_name: prod.name,
            unit_price: prod.price,
            max_stock: prod.stock_qty,
            quantity: Math.min(item.quantity, prod.stock_qty)
          });
        }
      }
      setCart(restoredCart);
      setCorrectingRef(correctTarget.receipt_no);
      setSuccess(
        `Voided ${correctTarget.receipt_no} for correction and loaded its items into New Station Sale.`
      );
      setCorrectTarget(null);
      setCorrectReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start sale correction.");
    }
  };
  return <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Record Sales Transactions
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Process station purchases for walk-in or registered customers. Confirming a sale deducts inventory and updates daily sales totals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {
    /* New Sale Builder */
  }
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">New Station Sale</h2>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>}
          {correctingRef && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
              Correcting voided receipt <span className="font-mono font-semibold">{correctingRef}</span> — adjust items or quantities below, then click Confirm & Save Sale.
            </div>}
          {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
              {success}
            </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Customer (Optional)
                </label>
                <button
    type="button"
    onClick={() => setShowQuickCustomer(true)}
    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline"
  >
                  <UserPlus className="h-3 w-3" /> New Customer
                </button>
              </div>
              <select
    value={customerId}
    onChange={(e) => setCustomerId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>
                    {c.name} ({c.customer_type})
                  </option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
    value={paymentMethod}
    onChange={(e) => setPaymentMethod(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-700">
              Select Product & Quantity
            </label>
            <select
    value={selectedProductId}
    onChange={(e) => setSelectedProductId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
              {products.map((p) => <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.price)} (Stock: {p.stock_qty})
                </option>)}
            </select>
            <div className="flex items-center gap-2">
              <label htmlFor="pos-qty-input" className="text-xs font-semibold text-slate-600 shrink-0">
                Quantity
              </label>
              <input
    id="pos-qty-input"
    type="number"
    min="1"
    value={qtyInput}
    onChange={(e) => setQtyInput(e.target.value)}
    className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
              <button
    type="button"
    onClick={addToCart}
    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 shrink-0"
  >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            </div>
          </div>

          {
    /* Cart Items */
  }
          <div className="border-t border-slate-100 pt-3">
            {cart.length === 0 ? <p className="py-4 text-center text-xs text-slate-400">
                No items added yet.
              </p> : <div className="divide-y divide-slate-100 text-xs">
                {cart.map((item) => <div key={item.product_id} className="flex items-center justify-between py-2 gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 truncate">
                        {item.product_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {formatCurrency(item.unit_price)} each
                      </div>
                    </div>
                    <input
    type="number"
    min="1"
    max={item.max_stock}
    value={item.quantity}
    onChange={(e) => updateCartQty(item.product_id, Number(e.target.value))}
    className="w-16 rounded border border-slate-300 px-2 py-1 text-right font-mono text-xs"
  />
                    <div className="w-20 text-right font-mono font-semibold tabular-nums">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </div>
                    <button
    type="button"
    onClick={() => updateCartQty(item.product_id, 0)}
    className="p-1 text-slate-400 hover:text-red-600"
    aria-label="Remove item"
  >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>)}
              </div>}
          </div>

          <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Grand Total</span>
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          <button
    type="button"
    onClick={handleConfirmSale}
    disabled={cart.length === 0}
    className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
  >
            Confirm & Save Sale
          </button>
        </div>

        {
    /* Recent Sales List */
  }
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Station Sales History ({sales.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Receipt #</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Items</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => <tr
    key={s.id}
    className={s.status === "voided" ? "bg-red-50/40 text-slate-400" : "hover:bg-slate-50"}
  >
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      <div>{s.receipt_no}</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        {formatDateTime(s.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">{s.customer_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {s.items?.map((i) => `${i.quantity}\xD7 ${i.product_name}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(s.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
    className={`font-semibold ${s.status === "completed" ? "text-emerald-700" : "text-red-700"}`}
  >
                        {s.status === "completed" ? "Completed" : "Voided"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
    type="button"
    onClick={() => handlePrintSale(s)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
  >
                          <Printer className="h-3 w-3" />
                          {s.print_count > 0 ? "Reprint" : "Print"}
                        </button>
                        {s.status === "completed" && <>
                            <button
    type="button"
    onClick={() => {
      setCorrectTarget(s);
      setCorrectReason("");
    }}
    className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
  >
                              <Edit3 className="h-3 w-3" /> Correct
                            </button>
                            <button
    type="button"
    onClick={() => {
      setVoidTarget(s);
      setVoidReason("");
    }}
    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
  >
                              <Ban className="h-3 w-3" /> Void
                            </button>
                          </>}
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {voidTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleVoidSale}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Void Sale {voidTarget.receipt_no}
            </h3>
            <p className="text-xs text-slate-600">
              Voiding restores sold items back to stock and records this action in the activity log.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Voiding
              </label>
              <input
    type="text"
    required
    value={voidReason}
    onChange={(e) => setVoidReason(e.target.value)}
    placeholder="e.g. Wrong quantity entered"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setVoidTarget(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
  >
                Cancel
              </button>
              <button
    type="submit"
    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
  >
                Confirm Void
              </button>
            </div>
          </form>
        </div>}

      {correctTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleCorrectSale}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Correct Sale {correctTarget.receipt_no}
            </h3>
            <p className="text-xs text-slate-600">
              This voids {correctTarget.receipt_no} (restoring stock and logging the correction) and loads its items into the New Station Sale form so you can save the corrected transaction.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Correction (Required)
              </label>
              <input
    type="text"
    required
    value={correctReason}
    onChange={(e) => setCorrectReason(e.target.value)}
    placeholder="e.g. Wrong quantity or product selected"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setCorrectTarget(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
  >
                Cancel
              </button>
              <button
    type="submit"
    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
  >
                Void & Load into Builder
              </button>
            </div>
          </form>
        </div>}

      <QuickCustomerModal
        open={showQuickCustomer}
        onClose={() => setShowQuickCustomer(false)}
        onSelectedCustomer={async (cust, meta) => {
          await loadAll();
          setCustomerId(String(cust.id));
          setSuccess(
            meta?.isNew
              ? `Registered customer ${cust.name} and selected for this sale.`
              : `Selected existing customer ${cust.name}.`
          );
        }}
      />

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>;
};
export {
  SalesPOS
};
