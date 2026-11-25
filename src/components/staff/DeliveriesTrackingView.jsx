import { useEffect, useState } from "react";
import { Calendar, Check, CheckCircle2, Link2, MapPin, Plus, Printer, Truck, XCircle } from "lucide-react";
import { apiFetch, formatCurrency, formatDateTime } from "../../lib/api";
const DeliveriesTrackingView = ({
  onOpenDeliveryReference
}) => {
  const [deliveries, setDeliveries] = useState([]);
  const [unscheduledOrders, setUnscheduledOrders] = useState([]);
  const [roster, setRoster] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [personnel, setPersonnel] = useState("");
  const [schedule, setSchedule] = useState(
    new Date(Date.now() + 3600 * 1e3).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");
  const [reschedTarget, setReschedTarget] = useState(null);
  const [reschedPersonnel, setReschedPersonnel] = useState("");
  const [reschedTime, setReschedTime] = useState("");
  const [reschedNotes, setReschedNotes] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [collectOrder, setCollectOrder] = useState(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("Cash");
  const [copiedToken, setCopiedToken] = useState(null);
  const copyShareLink = async (d) => {
    const shareUrl = `${window.location.origin}/#delivery-reference/${encodeURIComponent(d.share_token)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToken(d.share_token);
      setSuccess(`Copied view-only map reference link for ${d.delivery_no} (${d.assigned_personnel}).`);
      setTimeout(() => setCopiedToken((curr) => curr === d.share_token ? null : curr), 2500);
    } catch {
      setSuccess(`Shareable delivery reference link: ${shareUrl}`);
    }
  };
  const loadAll = async () => {
    const [delRes, ordRes] = await Promise.all([
      apiFetch("/api/deliveries"),
      apiFetch("/api/orders")
    ]);
    setDeliveries(delRes.deliveries);
    setRoster(delRes.personnelRoster);
    if (delRes.personnelRoster.length > 0 && !personnel) {
      setPersonnel(delRes.personnelRoster[0]);
    }
    const activeDeliveryOrderIds = new Set(
      delRes.deliveries.filter((d) => d.status !== "Cancelled").map((d) => d.order_id)
    );
    const eligible = ordRes.orders.filter(
      (o) => o.order_type === "Delivery" && o.status !== "Cancelled" && !activeDeliveryOrderIds.has(o.id)
    );
    setUnscheduledOrders(eligible);
    if (eligible.length > 0 && !orderId) {
      setOrderId(String(eligible[0].id));
    }
  };
  useEffect(() => {
    loadAll();
  }, []);
  const handleCreateDelivery = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/deliveries", {
        method: "POST",
        body: JSON.stringify({
          order_id: String(orderId),
          assigned_personnel: personnel,
          scheduled_datetime: schedule,
          notes
        })
      });
      setSuccess("Delivery record created with status Pending.");
      setShowCreate(false);
      setNotes("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create delivery.");
    }
  };
  const updateStatus = async (d, nextStatus) => {
    setError("");
    setSuccess("");
    await apiFetch(`/api/deliveries/${d.id}`, {
      method: "PUT",
      body: JSON.stringify({ status: nextStatus })
    });
    setSuccess(`Updated ${d.delivery_no} status to ${nextStatus}.`);
    if (nextStatus === "Delivered" && Number(d.order_total || 0) - Number(d.amount_paid || 0) > 0) {
      setCollectOrder(d);
      setCollectAmount(
        String(Number(d.order_total || 0) - Number(d.amount_paid || 0))
      );
    }
    loadAll();
  };
  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!reschedTarget) return;
    await apiFetch(`/api/deliveries/${reschedTarget.id}`, {
      method: "PUT",
      body: JSON.stringify({
        status: "Pending",
        assigned_personnel: reschedPersonnel,
        scheduled_datetime: reschedTime,
        notes: reschedNotes
      })
    });
    setSuccess(`Rescheduled ${reschedTarget.delivery_no} and returned status to Pending.`);
    setReschedTarget(null);
    loadAll();
  };
  const handleCancel = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;
    await apiFetch(`/api/deliveries/${cancelTarget.id}`, {
      method: "PUT",
      body: JSON.stringify({
        status: "Cancelled",
        cancel_reason: cancelReason
      })
    });
    setSuccess(`Cancelled delivery ${cancelTarget.delivery_no}.`);
    setCancelTarget(null);
    setCancelReason("");
    loadAll();
  };
  const handleCollectPayment = async (e) => {
    e.preventDefault();
    if (!collectOrder) return;
    await apiFetch("/api/payments", {
      method: "POST",
      body: JSON.stringify({
        order_id: collectOrder.order_id,
        amount: Number(collectAmount),
        method: collectMethod,
        reference_note: `Collected upon delivery (${collectOrder.delivery_no})`
      })
    });
    setSuccess(`Recorded payment collected for ${collectOrder.order_no}.`);
    setCollectOrder(null);
    loadAll();
  };
  const filtered = statusFilter === "All" ? deliveries : deliveries.filter((d) => d.status === statusFilter);
  return <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Deliveries & Status Tracking
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Schedule delivery orders, assign delivery personnel, update status progression, and prepare map reference sheets for drivers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
    type="button"
    onClick={() => onOpenDeliveryReference("")}
    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
  >
            <Printer className="h-4 w-4 text-sky-600" />
            Driver Reference Sheet
          </button>
          <button
    type="button"
    onClick={() => setShowCreate(true)}
    disabled={unscheduledOrders.length === 0}
    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
  >
            <Plus className="h-4 w-4" />
            Schedule Delivery ({unscheduledOrders.length} Ready)
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {success}
        </div>}

      {showCreate && <form
    onSubmit={handleCreateDelivery}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Assign Delivery Personnel & Schedule
            </h2>
            <button
    type="button"
    onClick={() => setShowCreate(false)}
    className="text-xs text-slate-500"
  >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Order
              </label>
              <select
    required
    value={orderId}
    onChange={(e) => setOrderId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                {unscheduledOrders.map((o) => <option key={o.id} value={o.id}>
                    {o.order_no} — {o.customer_name} ({o.delivery_address})
                  </option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Personnel
              </label>
              <select
    required
    value={personnel}
    onChange={(e) => setPersonnel(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                {roster.map((r) => <option key={r} value={r}>
                    {r}
                  </option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Date & Time
              </label>
              <input
    type="datetime-local"
    required
    value={schedule}
    onChange={(e) => setSchedule(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Delivery Instructions
            </label>
            <input
    type="text"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="e.g. Collect balance upon arrival"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
          </div>
          <div className="flex justify-end gap-2">
            <button
    type="button"
    onClick={() => setShowCreate(false)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium"
  >
              Cancel
            </button>
            <button
    type="submit"
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
              Save Delivery
            </button>
          </div>
        </form>}

      {
    /* Status Filter Tabs */
  }
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {["All", "Pending", "Preparing", "Out for Delivery", "Delivered", "Cancelled"].map(
    (st) => <button
      key={st}
      type="button"
      onClick={() => setStatusFilter(st)}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${statusFilter === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
    >
              {st}
            </button>
  )}
      </div>

      <div className="space-y-3">
        {filtered.map((d) => {
    const balance = Math.max(0, Number(d.order_total || 0) - Number(d.amount_paid || 0));
    return <div
      key={d.id}
      className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-slate-900">{d.delivery_no}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-600">{d.order_no}</span>
                  <span aria-hidden="true">·</span>
                  <span
      className={`font-semibold ${d.status === "Delivered" ? "text-emerald-700" : d.status === "Out for Delivery" ? "text-sky-700" : d.status === "Preparing" ? "text-amber-700" : d.status === "Cancelled" ? "text-red-700" : "text-slate-700"}`}
    >
                    {d.status}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900">{d.customer_name}</div>
                <div className="text-xs text-slate-600">
                  {d.address} ({d.barangay})
                  {d.landmark_notes ? ` \xB7 Landmark: ${d.landmark_notes}` : ""}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3.5 w-3.5" /> Assigned: {d.assigned_personnel}
                  </span>
                  <span className="font-mono tabular-nums">
                    Schedule: {formatDateTime(d.scheduled_datetime)}
                  </span>
                  {balance > 0 && d.status !== "Cancelled" && <span className="font-mono font-semibold text-amber-700">
                      Balance: {formatCurrency(balance)}
                    </span>}
                </div>
                {d.notes && <div className="text-xs text-slate-500">Note: {d.notes}</div>}
                {d.cancel_reason && <div className="text-xs text-red-700">Cancelled: {d.cancel_reason}</div>}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
      type="button"
      onClick={() => onOpenDeliveryReference(d.share_token)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                  Map Reference
                </button>
                <button
      type="button"
      onClick={() => copyShareLink(d)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
                  {copiedToken === d.share_token ? <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied
                    </> : <>
                      <Link2 className="h-3.5 w-3.5 text-slate-500" />
                      Copy Link
                    </>}
                </button>

                {d.status === "Pending" && <button
      type="button"
      onClick={() => updateStatus(d, "Preparing")}
      className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
    >
                    Mark Preparing
                  </button>}

                {d.status === "Preparing" && <button
      type="button"
      onClick={() => updateStatus(d, "Out for Delivery")}
      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
    >
                    Out for Delivery
                  </button>}

                {d.status === "Out for Delivery" && <button
      type="button"
      onClick={() => updateStatus(d, "Delivered")}
      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
    >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Delivered
                  </button>}

                {["Pending", "Preparing", "Out for Delivery"].includes(d.status) && <>
                    <button
      type="button"
      onClick={() => {
        setReschedTarget(d);
        setReschedPersonnel(d.assigned_personnel);
        setReschedTime(d.scheduled_datetime.slice(0, 16));
        setReschedNotes(d.notes || "");
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
                      <Calendar className="h-3.5 w-3.5" /> Reschedule
                    </button>
                    <button
      type="button"
      onClick={() => {
        setCancelTarget(d);
        setCancelReason("");
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
    >
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  </>}
              </div>
            </div>;
  })}
      </div>

      {
    /* Reschedule / Reassign / Failed Delivery Modal */
  }
      {reschedTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleReschedule}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Reschedule / Reassign {reschedTarget.delivery_no}
            </h3>
            <p className="text-xs text-slate-600">
              Returns status to Pending with updated schedule, personnel, or failed-delivery note.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delivery Personnel
              </label>
              <select
    value={reschedPersonnel}
    onChange={(e) => setReschedPersonnel(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                {roster.map((r) => <option key={r} value={r}>
                    {r}
                  </option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Schedule
              </label>
              <input
    type="datetime-local"
    required
    value={reschedTime}
    onChange={(e) => setReschedTime(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason / Note
              </label>
              <input
    type="text"
    value={reschedNotes}
    onChange={(e) => setReschedNotes(e.target.value)}
    placeholder="e.g. Customer unavailable, rescheduled for tomorrow morning"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setReschedTarget(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium"
  >
                Cancel
              </button>
              <button
    type="submit"
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white"
  >
                Save Schedule
              </button>
            </div>
          </form>
        </div>}

      {
    /* Cancel Delivery Modal */
  }
      {cancelTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleCancel}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Cancel Delivery {cancelTarget.delivery_no}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cancellation Reason (Required)
              </label>
              <input
    type="text"
    required
    value={cancelReason}
    onChange={(e) => setCancelReason(e.target.value)}
    placeholder="Enter reason for cancellation"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setCancelTarget(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium"
  >
                Keep
              </button>
              <button
    type="submit"
    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white"
  >
                Confirm Cancel
              </button>
            </div>
          </form>
        </div>}

      {
    /* Collect Payment on Delivery Modal */
  }
      {collectOrder && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleCollectPayment}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Record Payment Collected — {collectOrder.order_no}
            </h3>
            <p className="text-xs text-slate-600">
              Delivery was marked Delivered. Record the payment collected by {collectOrder.assigned_personnel}.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Collected (₱)
              </label>
              <input
    type="number"
    step="0.01"
    min="0.01"
    required
    value={collectAmount}
    onChange={(e) => setCollectAmount(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
    value={collectMethod}
    onChange={(e) => setCollectMethod(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                <option value="Cash">Cash</option>
                <option value="GCash">GCash</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setCollectOrder(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium"
  >
                Record Later
              </button>
              <button
    type="submit"
    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white"
  >
                Save Payment
              </button>
            </div>
          </form>
        </div>}
    </div>;
};
export {
  DeliveriesTrackingView
};
