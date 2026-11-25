import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { apiFetch, formatCurrency, formatDateTime } from "../../lib/api";
const SearchRecordsView = () => {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [customerType, setCustomerType] = useState("All");
  const [date, setDate] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const runSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (status !== "All") params.set("status", status);
      if (customerType !== "All") params.set("customerType", customerType);
      if (date) params.set("date", date);
      const res = await apiFetch(`/api/search?${params.toString()}`);
      setResults(res);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    runSearch();
  }, [status, customerType, date]);
  const totalFound = results ? results.customers.length + results.products.length + results.orders.length + results.sales.length + results.deliveries.length : 0;
  return <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Search & Filter Records
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Search across customers, products, orders, sales receipts, and delivery records by keyword, date, status, or customer type.
        </p>
      </div>

      <form
    onSubmit={(e) => {
      e.preventDefault();
      runSearch();
    }}
    className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
  >
        <div className="lg:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Keyword (Name, Reference #, Barangay, Personnel)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
    type="text"
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Search any record..."
    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs"
  />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Order / Delivery Status
          </label>
          <select
    value={status}
    onChange={(e) => setStatus(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Customer Type
          </label>
          <select
    value={customerType}
    onChange={(e) => setCustomerType(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
  >
            <option value="All">All Types</option>
            <option value="regular">Regular</option>
            <option value="reseller">Reseller</option>
            <option value="walk-in">Walk-in</option>
          </select>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Date
            </label>
            <input
    type="date"
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
  />
          </div>
          <button
    type="submit"
    className="self-end rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
            Search
          </button>
        </div>
      </form>

      {loading || !results ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Searching records...
        </div> : totalFound === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No records match the search keyword or filters. Try adjusting or clearing the filters.
        </div> : <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {
    /* Customers */
  }
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Customers ({results.customers.length})
            </h2>
            {results.customers.length === 0 ? <p className="text-xs text-slate-400">No matching customers.</p> : <div className="divide-y divide-slate-100 text-xs">
                {results.customers.map((c) => <div key={c.id} className="py-2">
                    <div className="font-semibold text-slate-900">
                      {c.name} <span className="font-normal text-slate-500">({c.customer_type})</span>
                    </div>
                    <div className="text-slate-600">
                      {c.contact_number} · {c.address}
                    </div>
                  </div>)}
              </div>}
          </div>

          {
    /* Orders */
  }
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Orders ({results.orders.length})
            </h2>
            {results.orders.length === 0 ? <p className="text-xs text-slate-400">No matching orders.</p> : <div className="divide-y divide-slate-100 text-xs">
                {results.orders.map((o) => <div key={o.id} className="py-2 flex justify-between gap-2">
                    <div>
                      <div className="font-mono font-semibold text-slate-900">
                        {o.order_no} · {o.customer_name}
                      </div>
                      <div className="text-slate-500">
                        {o.order_type} · {o.status} · {o.payment_status}
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-slate-900">
                      {formatCurrency(o.total_amount)}
                    </div>
                  </div>)}
              </div>}
          </div>

          {
    /* Sales */
  }
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Sales Receipts ({results.sales.length})
            </h2>
            {results.sales.length === 0 ? <p className="text-xs text-slate-400">No matching sales.</p> : <div className="divide-y divide-slate-100 text-xs">
                {results.sales.map((s) => <div key={s.id} className="py-2 flex justify-between gap-2">
                    <div>
                      <div className="font-mono font-semibold text-slate-900">
                        {s.receipt_no} · {s.customer_name}
                      </div>
                      <div className="text-slate-500">
                        {formatDateTime(s.created_at)} · {s.status}
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-slate-900">
                      {formatCurrency(s.total_amount)}
                    </div>
                  </div>)}
              </div>}
          </div>

          {
    /* Deliveries */
  }
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Deliveries ({results.deliveries.length})
            </h2>
            {results.deliveries.length === 0 ? <p className="text-xs text-slate-400">No matching deliveries.</p> : <div className="divide-y divide-slate-100 text-xs">
                {results.deliveries.map((d) => <div key={d.id} className="py-2">
                    <div className="flex justify-between font-semibold text-slate-900">
                      <span className="font-mono">
                        {d.delivery_no} · {d.customer_name}
                      </span>
                      <span>{d.status}</span>
                    </div>
                    <div className="text-slate-500">
                      {d.address} ({d.barangay}) · Personnel: {d.assigned_personnel}
                    </div>
                  </div>)}
              </div>}
          </div>

          {
    /* Products */
  }
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Products ({results.products.length})
            </h2>
            {results.products.length === 0 ? <p className="text-xs text-slate-400">No matching products.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {results.products.map((p) => <div key={p.id} className="rounded-lg border border-slate-100 p-3">
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="text-slate-500">{p.category}</div>
                    <div className="mt-1 font-mono text-slate-800">
                      {formatCurrency(p.price)} · Stock: {p.stock_qty}
                    </div>
                  </div>)}
              </div>}
          </div>
        </div>}
    </div>;
};
export {
  SearchRecordsView
};
