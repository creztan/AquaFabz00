import { useEffect, useState } from "react";
import { CreditCard, MapPin, Pencil, Plus, Printer, Trash2, UserPlus, XCircle } from "lucide-react";
import { apiFetch, formatCurrency, formatDateTime } from "../../lib/api";
import { ReceiptModal } from "../ReceiptModal";
import { QuickCustomerModal } from "./QuickCustomerModal";
import { QuickLocationPinModal } from "./QuickLocationPinModal";
const OrdersPaymentsView = ({ initialCustomerId = null }) => {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showNewOrder, setShowNewOrder] = useState(Boolean(initialCustomerId));
  const [customerId, setCustomerId] = useState(
    initialCustomerId ? String(initialCustomerId) : ""
  );
  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(String(initialCustomerId));
      setShowNewOrder(true);
    }
  }, [initialCustomerId]);
  const [orderType, setOrderType] = useState("Delivery");
  const [locationId, setLocationId] = useState("");
  const [requestedDatetime, setRequestedDatetime] = useState(
    new Date(Date.now() + 3600 * 1e3).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [selectedProdId, setSelectedProdId] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [payOrder, setPayOrder] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Cash");
  const [payRef, setPayRef] = useState("");
  const [payErr, setPayErr] = useState("");
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [editOrder, setEditOrder] = useState(null);
  const [editType, setEditType] = useState("Delivery");
  const [editLocationId, setEditLocationId] = useState("");
  const [editDatetime, setEditDatetime] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editItems, setEditItems] = useState([]);
  const [editAddProdId, setEditAddProdId] = useState("");
  const [editAddQty, setEditAddQty] = useState("1");
  const [editErr, setEditErr] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [pinModalContext, setPinModalContext] = useState(null);
  const loadAll = async () => {
    const [ordRes, payRes, custRes, prodRes] = await Promise.all([
      apiFetch("/api/orders"),
      apiFetch("/api/payments"),
      apiFetch("/api/customers"),
      apiFetch("/api/products")
    ]);
    setOrders(ordRes.orders);
    setPayments(payRes.payments);
    setCustomers(custRes.customers);
    const active = prodRes.products.filter((p) => p.status === "active");
    setProducts(active);
    if (active.length > 0 && !selectedProdId) setSelectedProdId(String(active[0].id));
  };
  useEffect(() => {
    loadAll();
  }, []);
  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));
  const customerLocations = selectedCustomer?.locations || [];
  useEffect(() => {
    if (orderType !== "Delivery" || customerLocations.length === 0) {
      setLocationId("");
      return;
    }
    const stillValid = customerLocations.some((l) => String(l.id) === String(locationId));
    if (!stillValid) {
      const primary = customerLocations.find((l) => l.is_primary === 1) || customerLocations[0];
      setLocationId(String(primary.id));
    }
  }, [customerId, orderType, customers]);
  const addOrderItem = () => {
    const prod = products.find((p) => String(p.id) === String(selectedProdId));
    const qty = Number(itemQty);
    if (!prod || Number.isNaN(qty) || qty <= 0) return;
    const existing = orderItems.find((i) => i.product_id === prod.id);
    if (existing) {
      setOrderItems(
        orderItems.map(
          (i) => i.product_id === prod.id ? { ...i, quantity: i.quantity + qty } : i
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        { product_id: prod.id, product_name: prod.name, unit_price: prod.price, quantity: qty }
      ]);
    }
    setItemQty("1");
  };
  const orderTotal = orderItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          customer_id: String(customerId),
          order_type: orderType,
          delivery_location_id: orderType === "Delivery" ? String(locationId) : null,
          requested_datetime: requestedDatetime,
          notes,
          items: orderItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
        })
      });
      setSuccess(`Created order ${res.order.order_no}.`);
      setShowNewOrder(false);
      setOrderItems([]);
      setNotes("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save order.");
    }
  };
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payOrder) return;
    setPayErr("");
    try {
      const res = await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          order_id: payOrder.id,
          amount: Number(payAmount),
          method: payMethod,
          reference_note: payRef
        })
      });
      setSuccess(`Payment recorded for ${payOrder.order_no}. Status: ${res.orderPaymentStatus}.`);
      setPayOrder(null);
      setPayAmount("");
      setPayRef("");
      loadAll();
    } catch (err) {
      setPayErr(err instanceof Error ? err.message : "Could not record payment.");
    }
  };
  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!cancelOrder) return;
    await apiFetch(`/api/orders/${cancelOrder.id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason: cancelReason })
    });
    setSuccess(`Cancelled order ${cancelOrder.order_no} and any linked delivery.`);
    setCancelOrder(null);
    setCancelReason("");
    loadAll();
  };
  const openEditOrder = (o) => {
    const cust = customers.find((c) => c.id === o.customer_id);
    const locs = cust?.locations || [];
    setEditOrder(o);
    setEditType(o.order_type);
    setEditLocationId(
      o.delivery_location_id ? String(o.delivery_location_id) : locs[0] ? String(locs[0].id) : ""
    );
    setEditDatetime(o.requested_datetime ? o.requested_datetime.slice(0, 16) : "");
    setEditNotes(o.notes || "");
    setEditItems(
      (o.items || []).map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        unit_price: it.unit_price,
        quantity: it.quantity
      }))
    );
    setEditAddProdId(products[0] ? String(products[0].id) : "");
    setEditAddQty("1");
    setEditErr("");
  };
  const addEditOrderItem = () => {
    const prod = products.find((p) => String(p.id) === String(editAddProdId));
    const qty = Number(editAddQty);
    if (!prod || Number.isNaN(qty) || qty <= 0) return;
    const existing = editItems.find((i) => i.product_id === prod.id);
    if (existing) {
      setEditItems(
        editItems.map(
          (i) => i.product_id === prod.id ? { ...i, quantity: i.quantity + qty, unit_price: prod.price } : i
        )
      );
    } else {
      setEditItems([
        ...editItems,
        { product_id: prod.id, product_name: prod.name, unit_price: prod.price, quantity: qty }
      ]);
    }
    setEditAddQty("1");
  };
  const handleSaveEditOrder = async (e) => {
    e.preventDefault();
    if (!editOrder) return;
    setEditErr("");
    try {
      await apiFetch(`/api/orders/${editOrder.id}`, {
        method: "PUT",
        body: JSON.stringify({
          order_type: editType,
          delivery_location_id: editType === "Delivery" ? String(editLocationId) : null,
          requested_datetime: editDatetime,
          notes: editNotes,
          items: editItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
        })
      });
      setSuccess(`Updated order ${editOrder.order_no} and synced any linked delivery.`);
      setEditOrder(null);
      loadAll();
    } catch (err) {
      setEditErr(err instanceof Error ? err.message : "Unable to save order changes.");
    }
  };
  const printOrder = async (order) => {
    const res = await apiFetch(
      `/api/print/order/${order.id}`,
      { method: "POST" }
    );
    setReceipt({
      kind: "order",
      referenceNo: order.order_no,
      date: order.created_at,
      customerName: order.customer_name || "",
      customerContact: order.customer_contact,
      orderType: order.order_type,
      deliveryAddress: order.delivery_address,
      paymentStatus: order.payment_status,
      items: order.items,
      totalAmount: order.total_amount,
      amountPaid: order.amount_paid,
      notes: order.notes,
      isReprint: res.isReprint,
      printCount: res.printCount
    });
    loadAll();
  };
  const printPayment = async (p) => {
    const res = await apiFetch(
      `/api/print/payment/${p.id}`,
      { method: "POST" }
    );
    setReceipt({
      kind: "payment",
      referenceNo: p.payment_no,
      date: p.created_at,
      customerName: p.customer_name || "",
      paymentMethod: p.method,
      totalAmount: p.amount,
      notes: `Applied to Order ${p.order_no}${p.reference_note ? ` \xB7 ${p.reference_note}` : ""}`,
      isReprint: res.isReprint,
      printCount: res.printCount
    });
    loadAll();
  };
  return <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Orders & Payment Recording
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage pickup and delivery orders linked to customer profiles, record full or partial payments, and print order or payment slips.
          </p>
        </div>
        <button
    type="button"
    onClick={() => {
      setShowNewOrder(true);
      setError("");
    }}
    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
  >
          <Plus className="h-4 w-4" /> New Order
        </button>
      </div>

      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {success}
        </div>}

      {showNewOrder && <form
    onSubmit={handleCreateOrder}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Create Customer Order</h2>
            <button
    type="button"
    onClick={() => setShowNewOrder(false)}
    className="text-xs text-slate-500 hover:text-slate-900"
  >
              Cancel
            </button>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Customer Profile (Required)
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
    required
    value={customerId}
    onChange={(e) => setCustomerId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>
                    {c.name} ({c.customer_type})
                  </option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Type
              </label>
              <select
    value={orderType}
    onChange={(e) => setOrderType(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                <option value="Delivery">Delivery</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            {orderType === "Delivery" && <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Delivery Location
                  </label>
                  {selectedCustomer && <button
    type="button"
    onClick={() => setPinModalContext({ mode: "create", customer: selectedCustomer })}
    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline"
  >
                      <MapPin className="h-3 w-3" /> Add Pin
                    </button>}
                </div>
                {customerLocations.length === 0 ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 space-y-1.5">
                    <div>
                      {selectedCustomer ? "Customer has no saved delivery locations yet." : "Select or register a customer first."}
                    </div>
                    {selectedCustomer && <button
    type="button"
    onClick={() => setPinModalContext({ mode: "create", customer: selectedCustomer })}
    className="inline-flex items-center gap-1 rounded bg-white border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
  >
                        <MapPin className="h-3 w-3" /> Pin Delivery Location Now
                      </button>}
                  </div> : <select
    required
    value={locationId}
    onChange={(e) => setLocationId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                    {customerLocations.map((loc) => <option key={loc.id} value={loc.id}>
                        {loc.label} — {loc.address}
                      </option>)}
                  </select>}
              </div>}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requested Date & Time
              </label>
              <input
    type="datetime-local"
    required
    value={requestedDatetime}
    onChange={(e) => setRequestedDatetime(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div className="flex flex-wrap gap-2">
              <select
    value={selectedProdId}
    onChange={(e) => setSelectedProdId(e.target.value)}
    className="w-full sm:flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                {products.map((p) => <option key={p.id} value={p.id}>
                    {p.name} — {formatCurrency(p.price)}
                  </option>)}
              </select>
              <input
    type="number"
    min="1"
    value={itemQty}
    onChange={(e) => setItemQty(e.target.value)}
    className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
              <button
    type="button"
    onClick={addOrderItem}
    className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
  >
                Add Item
              </button>
            </div>

            {orderItems.length > 0 && <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-4 text-xs">
                {orderItems.map((it) => <div key={it.product_id} className="flex items-center justify-between py-2">
                    <span>
                      {it.quantity}× {it.product_name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">
                        {formatCurrency(it.unit_price * it.quantity)}
                      </span>
                      <button
    type="button"
    onClick={() => setOrderItems(orderItems.filter((x) => x.product_id !== it.product_id))}
    className="text-slate-400 hover:text-red-600"
  >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>)}
                <div className="flex justify-between py-2.5 font-bold text-slate-900">
                  <span>Order Total</span>
                  <span className="font-mono">{formatCurrency(orderTotal)}</span>
                </div>
              </div>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Order Notes (Optional)
            </label>
            <input
    type="text"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="e.g. Call upon arrival or bring extra seals"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
          </div>

          <div className="flex justify-end gap-2">
            <button
    type="button"
    onClick={() => setShowNewOrder(false)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
  >
              Cancel
            </button>
            <button
    type="submit"
    disabled={orderItems.length === 0}
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
  >
              Save Order
            </button>
          </div>
        </form>}

      {
    /* Orders Table */
  }
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Customer Orders ({orders.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Order #</th>
                <th className="px-4 py-3 font-semibold">Customer & Type</th>
                <th className="px-4 py-3 font-semibold">Schedule</th>
                <th className="px-4 py-3 text-right font-semibold">Total / Balance</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
    const balance = Math.max(0, o.total_amount - o.amount_paid);
    return <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                      {o.order_no}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{o.customer_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {o.order_type}
                        {o.delivery_address ? ` \xB7 ${o.delivery_address}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                      {formatDateTime(o.requested_datetime)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      <div className="font-semibold text-slate-900">
                        {formatCurrency(o.total_amount)}
                      </div>
                      {balance > 0 && <div className="text-[11px] text-amber-700">
                          Bal: {formatCurrency(balance)}
                        </div>}
                    </td>
                    <td className="px-4 py-3">
                      <span
      className={`font-semibold ${o.payment_status === "Paid" ? "text-emerald-700" : o.payment_status === "Partial" ? "text-amber-700" : "text-red-700"}`}
    >
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{o.status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {o.status !== "Cancelled" && balance > 0 && <button
      type="button"
      onClick={() => {
        setPayOrder(o);
        setPayAmount(String(balance));
        setPayErr("");
      }}
      className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100"
    >
                            <CreditCard className="h-3 w-3" /> Pay
                          </button>}
                        <button
      type="button"
      onClick={() => printOrder(o)}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
    >
                          <Printer className="h-3 w-3" />
                          {o.print_count > 0 ? "Reprint" : "Print"}
                        </button>
                        {!["Cancelled", "Delivered", "Completed"].includes(o.status) && <>
                            <button
      type="button"
      onClick={() => openEditOrder(o)}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
    >
                              <Pencil className="h-3 w-3" /> Edit
                            </button>
                            <button
      type="button"
      onClick={() => {
        setCancelOrder(o);
        setCancelReason("");
      }}
      className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
    >
                              <XCircle className="h-3 w-3" /> Cancel
                            </button>
                          </>}
                      </div>
                    </td>
                  </tr>;
  })}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Payments History */
  }
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Recorded Payments ({payments.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Payment #</th>
                <th className="px-4 py-3 font-semibold">Order #</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Print</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                    {p.payment_no}
                  </td>
                  <td className="px-4 py-3 font-mono">{p.order_no}</td>
                  <td className="px-4 py-3">{p.customer_name}</td>
                  <td className="px-4 py-3">
                    {p.method}
                    {p.reference_note ? ` \xB7 ${p.reference_note}` : ""}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 tabular-nums">
                    {formatDateTime(p.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                    {formatCurrency(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
    type="button"
    onClick={() => printPayment(p)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
  >
                      <Printer className="h-3 w-3" />
                      {p.print_count > 0 ? "Reprint" : "Print"}
                    </button>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      {
    /* Record Payment Modal */
  }
      {payOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleRecordPayment}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Record Payment — {payOrder.order_no}
            </h3>
            <div className="rounded-lg bg-slate-50 p-3 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Order Total:</span>
                <span>{formatCurrency(payOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Already Paid:</span>
                <span>{formatCurrency(payOrder.amount_paid)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Remaining Balance:</span>
                <span>{formatCurrency(payOrder.total_amount - payOrder.amount_paid)}</span>
              </div>
            </div>

            {payErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {payErr}
              </div>}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Amount (₱)
              </label>
              <input
    type="number"
    step="0.01"
    min="0.01"
    max={payOrder.total_amount - payOrder.amount_paid}
    required
    value={payAmount}
    onChange={(e) => setPayAmount(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
    value={payMethod}
    onChange={(e) => setPayMethod(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference / Note (Optional)
              </label>
              <input
    type="text"
    value={payRef}
    onChange={(e) => setPayRef(e.target.value)}
    placeholder="e.g. Partial payment or GCash ref #"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>

            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setPayOrder(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
  >
                Cancel
              </button>
              <button
    type="submit"
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
                Confirm Payment
              </button>
            </div>
          </form>
        </div>}

      {
    /* Cancel Order Modal */
  }
      {cancelOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleCancelOrder}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Cancel Order {cancelOrder.order_no}
            </h3>
            <p className="text-xs text-slate-600">
              Cancelling this order will also cancel any linked pending delivery. A reason is required.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cancellation Reason
              </label>
              <input
    type="text"
    required
    value={cancelReason}
    onChange={(e) => setCancelReason(e.target.value)}
    placeholder="e.g. Customer requested cancellation"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setCancelOrder(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
  >
                Keep Order
              </button>
              <button
    type="submit"
    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
  >
                Confirm Cancellation
              </button>
            </div>
          </form>
        </div>}

      {
    /* Edit Order Modal */
  }
      {editOrder && (() => {
    const editCustomer = customers.find((c) => c.id === editOrder.customer_id);
    const editCustLocations = editCustomer?.locations || [];
    const editedTotal = editItems.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
            <form
      onSubmit={handleSaveEditOrder}
      className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
    >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Edit Order {editOrder.order_no}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Customer: {editOrder.customer_name} · Any linked pending delivery will also update.
                  </p>
                </div>
              </div>

              {editErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {editErr}
                </div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order Type
                  </label>
                  <select
      value={editType}
      onChange={(e) => {
        const nextType = e.target.value;
        setEditType(nextType);
        if (nextType === "Delivery" && !editLocationId && editCustLocations[0]) {
          setEditLocationId(String(editCustLocations[0].id));
        }
      }}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
    >
                    <option value="Delivery">Delivery</option>
                    <option value="Pickup">Pickup</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Requested Date & Time
                  </label>
                  <input
      type="datetime-local"
      required
      value={editDatetime}
      onChange={(e) => setEditDatetime(e.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
    />
                </div>
              </div>

              {editType === "Delivery" && <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Delivery Location
                    </label>
                    {editCustomer && <button
      type="button"
      onClick={() => setPinModalContext({ mode: "edit", customer: editCustomer })}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:underline"
    >
                        <MapPin className="h-3 w-3" /> Add Pin
                      </button>}
                  </div>
                  {editCustLocations.length === 0 ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 space-y-1.5">
                      <div>This customer has no saved delivery locations yet.</div>
                      {editCustomer && <button
      type="button"
      onClick={() => setPinModalContext({ mode: "edit", customer: editCustomer })}
      className="inline-flex items-center gap-1 rounded bg-white border border-amber-300 px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
    >
                          <MapPin className="h-3 w-3" /> Pin Delivery Location Now
                        </button>}
                    </div> : <select
      required
      value={editLocationId}
      onChange={(e) => setEditLocationId(e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
    >
                      {editCustLocations.map((loc) => <option key={loc.id} value={loc.id}>
                          {loc.label} — {loc.address}
                        </option>)}
                    </select>}
                </div>}

              <div className="border-t border-slate-100 pt-3 space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">Order Items</label>
                <div className="flex flex-wrap gap-2">
                  <select
      value={editAddProdId}
      onChange={(e) => setEditAddProdId(e.target.value)}
      className="w-full sm:flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
    >
                    {products.map((p) => <option key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.price)}
                      </option>)}
                  </select>
                  <input
      type="number"
      min="1"
      value={editAddQty}
      onChange={(e) => setEditAddQty(e.target.value)}
      className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
    />
                  <button
      type="button"
      onClick={addEditOrderItem}
      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
    >
                    Add
                  </button>
                </div>

                {editItems.length > 0 && <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 px-3.5 text-xs">
                    {editItems.map((it) => <div key={it.product_id} className="flex items-center justify-between py-2 gap-2">
                        <span className="flex-1 truncate font-medium text-slate-900">
                          {it.product_name}
                        </span>
                        <input
      type="number"
      min="1"
      value={it.quantity}
      onChange={(e) => {
        const val = Math.max(1, Number(e.target.value) || 1);
        setEditItems(
          editItems.map(
            (x) => x.product_id === it.product_id ? { ...x, quantity: val } : x
          )
        );
      }}
      className="w-16 rounded border border-slate-300 px-2 py-1 text-right font-mono text-xs"
    />
                        <span className="w-20 text-right font-mono font-semibold tabular-nums">
                          {formatCurrency(it.unit_price * it.quantity)}
                        </span>
                        <button
      type="button"
      onClick={() => setEditItems(editItems.filter((x) => x.product_id !== it.product_id))}
      className="text-slate-400 hover:text-red-600"
    >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>)}
                    <div className="flex justify-between py-2.5 font-bold text-slate-900">
                      <span>Updated Total (Paid: {formatCurrency(editOrder.amount_paid)})</span>
                      <span className="font-mono tabular-nums">{formatCurrency(editedTotal)}</span>
                    </div>
                  </div>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Order Notes
                </label>
                <input
      type="text"
      value={editNotes}
      onChange={(e) => setEditNotes(e.target.value)}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
    />
              </div>

              <div className="flex justify-end gap-2">
                <button
      type="button"
      onClick={() => setEditOrder(null)}
      className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
    >
                  Cancel
                </button>
                <button
      type="submit"
      disabled={editItems.length === 0 || editType === "Delivery" && editCustLocations.length === 0}
      className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
    >
                  Save Order Changes
                </button>
              </div>
            </form>
          </div>;
  })()}

      <QuickCustomerModal
        open={showQuickCustomer}
        onClose={() => setShowQuickCustomer(false)}
        onSelectedCustomer={async (cust, meta) => {
          await loadAll();
          setCustomerId(String(cust.id));
          if (cust.locations && cust.locations.length > 0) {
            setLocationId(String(cust.locations[0].id));
          }
          setSuccess(
            meta?.isNew
              ? `Registered customer ${cust.name} and selected for this order.`
              : `Selected existing customer ${cust.name}.`
          );
        }}
      />

      <QuickLocationPinModal
        open={Boolean(pinModalContext)}
        customer={pinModalContext?.customer || null}
        onClose={() => setPinModalContext(null)}
        onSavedLocation={async (loc) => {
          const targetMode = pinModalContext?.mode;
          await loadAll();
          if (targetMode === "edit") {
            setEditLocationId(String(loc.id));
          } else {
            setLocationId(String(loc.id));
          }
          setSuccess(`Saved delivery pin "${loc.label}" and selected it for this order.`);
        }}
      />

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>;
};
export {
  OrdersPaymentsView
};
