import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Droplets, MapPin, PackageCheck, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import { apiFetch, formatCurrency } from "../../lib/api";
const AdminDashboard = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailModal, setDetailModal] = useState(null);
  const [detailRows, setDetailRows] = useState([]);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/api/admin/dashboard");
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);
  const openRelatedList = async (kind) => {
    setDetailModal(kind);
    if (kind === "lowstock" && data) {
      setDetailRows(data.lowStockProducts);
      return;
    }
    try {
      if (kind === "pending") {
        const res = await apiFetch("/api/orders");
        setDetailRows(
          res.orders.filter(
            (o) => ["Pending", "Preparing", "Out for Delivery"].includes(String(o.status))
          )
        );
      } else if (kind === "deliveries") {
        const res = await apiFetch("/api/deliveries");
        setDetailRows(res.deliveries.filter((d) => d.status === "Delivered"));
      } else if (kind === "compliance") {
        const res = await apiFetch("/api/compliance-logs");
        setDetailRows(res.logs || []);
      }
    } catch {
      setDetailRows([]);
    }
  };
  if (loading) {
    return <div className="space-y-4">
        <div className="h-8 w-64 rounded bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-28 rounded-xl border border-slate-200 bg-white animate-pulse" />)}
        </div>
      </div>;
  }
  if (error || !data) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || "No records were found."}
      </div>;
  }
  return <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Station Executive Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Consolidated sales (station and vending machines), orders, deliveries, containers,
          low-stock items, and customer locations. Select any figure to inspect details.
        </p>
      </div>

      {
    /* Primary KPI Grid */
  }
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
    type="button"
    onClick={() => onNavigate("sales-monitoring")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Overall Sales</span>
            <ShoppingBag className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(data.totalSales)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
            <span>Station: {formatCurrency(data.stationSalesTotal)}</span>
            <span aria-hidden="true">·</span>
            <span>Vendo: {formatCurrency(data.vendingSalesTotal)}</span>
          </div>
        </button>

        <button
    type="button"
    onClick={() => openRelatedList("pending")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Pending & Active Orders</span>
            <PackageCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.pendingOrdersCount}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            View pending orders <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>

        <button
    type="button"
    onClick={() => openRelatedList("deliveries")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Completed Deliveries</span>
            <Truck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.completedDeliveriesCount}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            View delivered records <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>

        <button
    type="button"
    onClick={() => onNavigate("inventory")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Available Water Containers</span>
            <Droplets className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.availableContainersCount}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Round & slim containers on hand
          </div>
        </button>

        <button
    type="button"
    onClick={() => openRelatedList("lowstock")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-amber-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Low-Stock Items</span>
            <AlertTriangle
    className={`h-4 w-4 ${data.lowStockCount > 0 ? "text-amber-600" : "text-emerald-600"}`}
  />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.lowStockCount}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
            {data.lowStockCount > 0 ? "Items require replenishment" : "All stock levels normal"}{" "}
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate("delivery-areas")}
          className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Saved Delivery Locations</span>
            <MapPin className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.customerLocationsCount}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Open delivery areas map <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => openRelatedList("compliance")}
          className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-emerald-500 transition-colors"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Water Quality & Compliance</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.complianceLogsCount ?? 0}
          </div>
          <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
            Inspect DOH water tests <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>
      </div>

      {/* Low Stock Overview Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Low-Stock Replenishment Alerts
            </h2>
            <p className="text-xs text-slate-500">
              Station supplies and vending machines at or below minimum threshold
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("inventory")}
            className="text-xs font-semibold text-sky-700 hover:underline"
          >
            View Full Inventory
          </button>
        </div>

        {data.lowStockProducts.length === 0 && (data.lowStockVendo || []).length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            All station products and vending machines are above minimum stock levels.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Item / Machine</th>
                  <th className="px-5 py-3 font-semibold">Category / Location</th>
                  <th className="px-5 py-3 text-right font-semibold">On Hand</th>
                  <th className="px-5 py-3 text-right font-semibold">Minimum Level</th>
                  <th className="px-5 py-3 font-semibold">Alert Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.lowStockProducts.map((p) => (
                  <tr key={`prod-${p.id}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                    <td className="px-5 py-3 text-slate-600">{p.category}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-red-700 tabular-nums">
                      {p.stock_qty} {p.unit}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600 tabular-nums">
                      {p.min_stock_level}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Low Stock
                      </span>
                    </td>
                  </tr>
                ))}
                {(data.lowStockVendo || []).map((vm) => (
                  <tr key={`vm-${vm.id}`} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{vm.name}</td>
                    <td className="px-5 py-3 text-slate-600">Vending Machine · {vm.location_name}</td>
                    <td className="px-5 py-3 text-right font-mono font-semibold text-red-700 tabular-nums">
                      {vm.stock_qty} gal
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-slate-600 tabular-nums">
                      {vm.min_stock_level}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Vending Low Stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {
    /* Related List Modal (Normal Flow step 2) */
  }
      {detailModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-900">
                {detailModal === "pending" && "Pending & Active Orders"}
                {detailModal === "deliveries" && "Completed Deliveries"}
                {detailModal === "lowstock" && "Low-Stock Products"}
                {detailModal === "compliance" && "Water Quality & Sanitary Compliance Logs"}
              </h3>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {detailRows.length === 0 ? (
                <p className="text-sm text-slate-500">No records were found for this view.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="pb-2 font-semibold">
                        {detailModal === "compliance" ? "Test / Parameter" : "Reference / Name"}
                      </th>
                      <th className="pb-2 font-semibold">
                        {detailModal === "compliance" ? "Date & Inspector" : "Details"}
                      </th>
                      <th className="pb-2 text-right font-semibold">
                        {detailModal === "compliance" ? "Status / Value" : "Value / Qty"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-medium text-slate-900">
                          {detailModal === "compliance"
                            ? `${row.parameter_name} (${row.log_type})`
                            : String(row.order_no || row.delivery_no || row.name)}
                        </td>
                        <td className="py-2.5 text-slate-600">
                          {detailModal === "compliance"
                            ? `${row.date} · Inspector: ${row.inspector_or_staff || "Staff"}`
                            : String(
                                row.customer_name
                                  ? `${row.customer_name} · ${row.status}`
                                  : `${row.category} · Min ${row.min_stock_level}`
                              )}
                        </td>
                        <td className="py-2.5 text-right font-mono tabular-nums">
                          {detailModal === "compliance" ? (
                            <span className="font-semibold text-emerald-700">
                              {row.recorded_value ? `${row.recorded_value} (${row.status})` : row.status}
                            </span>
                          ) : row.total_amount !== undefined ? (
                            formatCurrency(Number(row.total_amount))
                          ) : row.order_total !== undefined ? (
                            formatCurrency(Number(row.order_total))
                          ) : (
                            `${row.stock_qty} ${row.unit}`
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>}
    </div>;
};
export {
  AdminDashboard
};
