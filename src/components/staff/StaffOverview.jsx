import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Droplets, MapPin, Package, ShoppingCart, Truck } from "lucide-react";
import { apiFetch, formatCurrency } from "../../lib/api";
const StaffOverview = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiFetch("/api/staff/overview").then(setData).finally(() => setLoading(false));
  }, []);
  if (loading || !data) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading station operations...
      </div>;
  }
  const lowStockItems = Array.isArray(data.lowStockItems) ? data.lowStockItems : [];
  return <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Station Daily Operations
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Record counter and vending machine sales, manage customer orders and payments,
          schedule deliveries, track containers, and update stock levels.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
    type="button"
    onClick={() => onNavigate("pos-sales")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Today&apos;s Counter Sales</span>
            <ShoppingCart className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatCurrency(data.todaySalesTotal)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            {data.todaySalesCount} transaction{data.todaySalesCount === 1 ? "" : "s"} today
          </div>
        </button>

        <button
    type="button"
    onClick={() => onNavigate("orders-payments")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Open Orders</span>
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.openOrdersCount}
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Manage orders & payments <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>

        <button
    type="button"
    onClick={() => onNavigate("deliveries")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Active Deliveries</span>
            <Truck className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.activeDeliveriesCount}
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Update status & map ref <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>

        <button
    type="button"
    onClick={() => onNavigate("containers")}
    className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-sky-500 transition-colors"
  >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Unreturned Containers</span>
            <Droplets className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {data.unreturnedContainersCount}
          </div>
          <div className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
            Track borrowed & returns <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </button>
      </div>

      {
    /* Quick Operational Shortcuts */
  }
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
    type="button"
    onClick={() => onNavigate("pos-sales")}
    className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors"
  >
          <div className="text-sm font-semibold text-slate-900">Record New Sale</div>
          <div className="mt-1 text-xs text-slate-500">
            Process walk-in or customer purchases and print receipts.
          </div>
        </button>
        <button
    type="button"
    onClick={() => onNavigate("vending-sales")}
    className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors"
  >
          <div className="text-sm font-semibold text-slate-900">Record Vending Collection</div>
          <div className="mt-1 text-xs text-slate-500">
            Log daily earnings collected from each station vending machine.
          </div>
        </button>
        <button
    type="button"
    onClick={() => onNavigate("location-mapping")}
    className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition-colors"
  >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">Pin Customer Location</span>
            <MapPin className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Place or update customer delivery pins on the digital map.
          </div>
        </button>
      </div>

      {
    /* Low Stock Watch */
  }
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Low-Stock Watch ({lowStockItems.length})
          </h2>
          <button
    type="button"
    onClick={() => onNavigate("inventory")}
    className="text-xs font-semibold text-sky-700 hover:underline"
  >
            Manage Stock-In / Stock-Out
          </button>
        </div>
        {lowStockItems.length === 0 ? <div className="p-5 text-xs text-slate-500">
            All station products are above minimum stock levels.
          </div> : <div className="divide-y divide-slate-100">
            {lowStockItems.map((item) => <div key={item.id} className="flex items-center justify-between px-5 py-3 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="font-medium text-slate-900">{item.name}</span>
                  <span className="text-slate-500">· {item.category}</span>
                </div>
                <div className="font-mono font-semibold text-red-700 tabular-nums">
                  {item.stock_qty} / min {item.min_stock_level} {item.unit}
                </div>
              </div>)}
          </div>}
      </div>
    </div>;
};
export {
  StaffOverview
};
