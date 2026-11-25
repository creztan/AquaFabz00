import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardList, Droplets, Edit2, History, MapPin, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { apiFetch, formatCurrency, formatDateTime } from "../../lib/api";
const CustomersView = ({
  onOpenLocationMapping,
  onOpenNewOrder,
  onOpenNewSale,
  onOpenContainers
}) => {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [duplicateCustomer, setDuplicateCustomer] = useState(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [customerType, setCustomerType] = useState("regular");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyFilter, setHistoryFilter] = useState("all");
  const loadCustomers = async () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (typeFilter !== "all") params.set("type", typeFilter);
    const res = await apiFetch(`/api/customers?${params.toString()}`);
    setCustomers(res.customers);
  };
  useEffect(() => {
    loadCustomers();
  }, [query, typeFilter]);
  const openAdd = () => {
    setEditing(null);
    setName("");
    setContact("");
    setAddress("");
    setCustomerType("regular");
    setDuplicateCustomer(null);
    setError("");
    setShowForm(true);
  };
  const openEdit = (c) => {
    setEditing(c);
    setName(c.name);
    setContact(c.contact_number);
    setAddress(c.address);
    setCustomerType(c.customer_type);
    setDuplicateCustomer(null);
    setError("");
    setShowForm(true);
  };
  const saveCustomer = async (forceCreate = false) => {
    setError("");
    setSuccess("");
    setDuplicateCustomer(null);
    try {
      if (editing) {
        await apiFetch(`/api/customers/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            contact_number: contact,
            address,
            customer_type: customerType
          })
        });
        setSuccess(`Updated profile for ${name}.`);
      } else {
        await apiFetch("/api/customers", {
          method: "POST",
          body: JSON.stringify({
            name,
            contact_number: contact,
            address,
            customer_type: customerType,
            forceCreate
          })
        });
        setSuccess(`Registered customer profile for ${name}.`);
      }
      setShowForm(false);
      loadCustomers();
    } catch (err) {
      const eObj = err;
      if (eObj.status === 409 && eObj.data?.existingCustomer) {
        setDuplicateCustomer(eObj.data.existingCustomer);
      } else {
        setError(eObj.message || "Could not save customer.");
      }
    }
  };
  const loadHistory = async (cid) => {
    const res = await apiFetch(`/api/customers/${cid}/history`);
    setHistoryData(res);
    setHistoryFilter("all");
  };
  const confirmDeleteCustomer = async () => {
    if (!deleteTarget) return;
    setError("");
    setSuccess("");
    setDeleting(true);
    try {
      await apiFetch(`/api/customers/${deleteTarget.id}`, {
        method: "DELETE"
      });
      if (historyData?.customer?.id === deleteTarget.id) {
        setHistoryData(null);
      }
      if (editing?.id === deleteTarget.id) {
        setShowForm(false);
        setEditing(null);
      }
      setSuccess(`Deleted customer profile for ${deleteTarget.name}.`);
      setDeleteTarget(null);
      await loadCustomers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete customer profile.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };
  return <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Customers & Transaction History
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Register walk-in, regular, and reseller profiles, manage multiple delivery locations, and inspect complete transaction history.
          </p>
        </div>
        <button
    type="button"
    onClick={openAdd}
    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
  >
          <Plus className="h-4 w-4" /> Register Customer
        </button>
      </div>

      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {success}
        </div>}

      {error && !showForm && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          {error}
        </div>}

      {showForm && <form
    onSubmit={(e) => {
      e.preventDefault();
      saveCustomer(false);
    }}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {editing ? `Edit Profile \u2014 ${editing.name}` : "Register New Customer"}
            </h2>
            <button
    type="button"
    onClick={() => setShowForm(false)}
    className="text-xs text-slate-500"
  >
              Cancel
            </button>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>}

          {duplicateCustomer && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  A similar customer already exists: <strong>{duplicateCustomer.name}</strong> (
                  {duplicateCustomer.contact_number}). Open existing profile or confirm creating a new profile.
                </span>
              </div>
              <div className="flex gap-2">
                <button
    type="button"
    onClick={() => {
      const existing = customers.find((c) => c.id === duplicateCustomer.id);
      if (existing) openEdit(existing);
    }}
    className="rounded-md bg-white border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900"
  >
                  Open Existing Profile
                </button>
                <button
    type="button"
    onClick={() => saveCustomer(true)}
    className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white"
  >
                  Create Anyway
                </button>
              </div>
            </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name
              </label>
              <input
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number
              </label>
              <input
    type="text"
    required
    value={contact}
    onChange={(e) => setContact(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Address
              </label>
              <input
    type="text"
    required
    value={address}
    onChange={(e) => setAddress(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Type
              </label>
              <select
    value={customerType}
    onChange={(e) => setCustomerType(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
                <option value="regular">Regular</option>
                <option value="reseller">Reseller</option>
                <option value="walk-in">Walk-in</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
    type="button"
    onClick={() => setShowForm(false)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium"
  >
              Cancel
            </button>
            <button
    type="submit"
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
              Save Customer Profile
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
    placeholder="Search customers by name, contact, or address..."
    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs"
  />
        </div>
        <select
    value={typeFilter}
    onChange={(e) => setTypeFilter(e.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
          <option value="all">All Customer Types</option>
          <option value="regular">Regular</option>
          <option value="reseller">Reseller</option>
          <option value="walk-in">Walk-in</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Locations</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {c.contact_number}
                      </div>
                      <div className="text-[11px] text-slate-500">{c.address}</div>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-700">{c.customer_type}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {c.locations?.length || 0} saved pin(s)
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
    type="button"
    onClick={() => onOpenNewOrder && onOpenNewOrder(c)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-50"
    title="Create order for this customer"
  >
                          <ClipboardList className="h-3 w-3" /> Order
                        </button>
                        <button
    type="button"
    onClick={() => onOpenNewSale && onOpenNewSale(c)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
    title="Record POS sale for this customer"
  >
                          <ShoppingCart className="h-3 w-3" /> Sale
                        </button>
                        <button
    type="button"
    onClick={() => onOpenContainers && onOpenContainers(c)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
    title="Manage containers for this customer"
  >
                          <Droplets className="h-3 w-3" /> Containers
                        </button>
                        <button
    type="button"
    onClick={() => loadHistory(c.id)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
  >
                          <History className="h-3 w-3" /> History
                        </button>
                        <button
    type="button"
    onClick={() => onOpenLocationMapping(c.id)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-50"
  >
                          <MapPin className="h-3 w-3" /> Map
                        </button>
                        <button
    type="button"
    onClick={() => openEdit(c)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
  >
                          <Edit2 className="h-3 w-3" /> Edit
                        </button>
                        <button
    type="button"
    onClick={() => setDeleteTarget(c)}
    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
    title="Delete customer profile"
  >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {
    /* UC12: Customer Transaction History Panel */
  }
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          {!historyData ? <div className="py-10 text-center text-xs text-slate-500">
              Select <strong>History</strong> on any customer to inspect their purchases, orders, payments, and deliveries.
            </div> : <>
              <div className="border-b border-slate-100 pb-3">
                <div className="text-xs text-slate-500">Customer Transaction History</div>
                <h3 className="text-base font-bold text-slate-900">{historyData.customer.name}</h3>
                <div className="text-xs text-slate-600 mt-0.5">
                  {historyData.customer.contact_number} · {historyData.customer.customer_type}
                </div>
              </div>

              <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
                {["all", "sales", "orders", "payments", "deliveries"].map((tab) => <button
    key={tab}
    type="button"
    onClick={() => setHistoryFilter(tab)}
    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize ${historyFilter === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
  >
                    {tab}
                  </button>)}
              </div>

              {historyData.sales.length === 0 && historyData.orders.length === 0 && historyData.payments.length === 0 && historyData.deliveries.length === 0 ? <p className="py-6 text-center text-xs text-slate-500">
                  No transactions were found for this customer yet.
                </p> : <div className="max-h-[420px] overflow-y-auto space-y-3 text-xs">
                  {(historyFilter === "all" || historyFilter === "sales") && historyData.sales.map((s) => <div key={`s-${s.id}`} className="border-b border-slate-100 pb-2">
                        <div className="flex justify-between font-semibold text-slate-900">
                          <span className="font-mono">Sale {s.receipt_no}</span>
                          <span className="font-mono">{formatCurrency(s.total_amount)}</span>
                        </div>
                        <div className="text-slate-500">
                          {formatDateTime(s.created_at)} · {s.payment_method} ({s.status})
                        </div>
                      </div>)}

                  {(historyFilter === "all" || historyFilter === "orders") && historyData.orders.map((o) => <div key={`o-${o.id}`} className="border-b border-slate-100 pb-2">
                        <div className="flex justify-between font-semibold text-slate-900">
                          <span className="font-mono">Order {o.order_no}</span>
                          <span className="font-mono">{formatCurrency(o.total_amount)}</span>
                        </div>
                        <div className="text-slate-500">
                          {o.order_type} · {o.status} · Payment: {o.payment_status}
                        </div>
                      </div>)}

                  {(historyFilter === "all" || historyFilter === "payments") && historyData.payments.map((p) => <div key={`p-${p.id}`} className="border-b border-slate-100 pb-2">
                        <div className="flex justify-between font-semibold text-emerald-700">
                          <span className="font-mono">Payment {p.payment_no}</span>
                          <span className="font-mono">{formatCurrency(p.amount)}</span>
                        </div>
                        <div className="text-slate-500">
                          Order {p.order_no} · {p.method} · {formatDateTime(p.created_at)}
                        </div>
                      </div>)}

                  {(historyFilter === "all" || historyFilter === "deliveries") && historyData.deliveries.map((d) => <div key={`d-${d.id}`} className="border-b border-slate-100 pb-2">
                        <div className="flex justify-between font-semibold text-slate-900">
                          <span className="font-mono">Delivery {d.delivery_no}</span>
                          <span>{d.status}</span>
                        </div>
                        <div className="text-slate-500">
                          {d.address} · Personnel: {d.assigned_personnel}
                        </div>
                      </div>)}
                </div>}
            </>}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2 text-red-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Delete Customer Profile
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Are you sure you want to delete <strong>{deleteTarget.name}</strong> ({deleteTarget.contact_number})? Past sales and order records will keep their transaction history, but the customer profile and saved pins will be permanently removed.
                </p>
                {(deleteTarget.open_orders_count > 0 || deleteTarget.unreturned_containers > 0) && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                    Note: This customer currently has {deleteTarget.open_orders_count || 0} open order(s) and {deleteTarget.unreturned_containers || 0} unreturned container(s).
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCustomer}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Profile"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>;
};
export {
  CustomersView
};
