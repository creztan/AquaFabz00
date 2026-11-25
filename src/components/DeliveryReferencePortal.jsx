import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer, Truck } from "lucide-react";
import { apiFetch, formatCurrency, formatDateTime } from "../lib/api";
import { LocationMap } from "./LocationMap";
const DeliveryReferencePortal = ({
  initialToken = null,
  onBack,
  backLabel = "Back to Login"
}) => {
  const [station, setStation] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [roster, setRoster] = useState([]);
  const [personnelFilter, setPersonnelFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (initialToken) {
          const data = await apiFetch(
            `/api/public/delivery-reference/${encodeURIComponent(initialToken)}`
          );
          setStation(data.station);
          setDeliveries([data.delivery]);
          setSelectedDelivery(data.delivery);
        } else {
          const params = new URLSearchParams();
          if (personnelFilter !== "All") params.set("personnel", personnelFilter);
          if (statusFilter !== "All") params.set("status", statusFilter);
          const data = await apiFetch(`/api/public/delivery-reference?${params.toString()}`);
          setStation(data.station);
          setRoster(data.personnelRoster);
          setDeliveries(data.deliveries);
          if (data.deliveries.length > 0 && !selectedDelivery) {
            setSelectedDelivery(data.deliveries[0]);
          } else if (selectedDelivery) {
            const match = data.deliveries.find((d) => d.id === selectedDelivery.id) || data.deliveries[0] || null;
            setSelectedDelivery(match);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load delivery reference.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [initialToken, personnelFilter, statusFilter]);
  const mapPins = useMemo(() => {
    const list = [];
    if (station) {
      list.push({
        id: "station",
        label: station.name,
        sublabel: "Starting Station",
        address: station.address,
        lat: station.lat,
        lng: station.lng,
        kind: "station"
      });
    }
    const itemsToShow = selectedDelivery ? [selectedDelivery] : deliveries;
    itemsToShow.forEach((d) => {
      if (d.lat && d.lng) {
        list.push({
          id: `del-${d.id}`,
          label: `${d.delivery_no} \xB7 ${d.customer_name}`,
          sublabel: `${d.status} \xB7 Assigned: ${d.assigned_personnel}`,
          address: d.address || "",
          barangay: d.barangay,
          landmark: d.landmark_notes,
          lat: d.lat,
          lng: d.lng,
          kind: d.status === "Delivered" ? "customer" : "pending"
        });
      }
    });
    return list;
  }, [station, deliveries, selectedDelivery]);
  const statusBadgeColor = (status) => {
    switch (status) {
      case "Delivered":
        return "text-emerald-700";
      case "Out for Delivery":
        return "text-sky-700";
      case "Preparing":
        return "text-amber-700";
      case "Cancelled":
        return "text-red-700";
      default:
        return "text-slate-700";
    }
  };
  return <div className="min-h-screen bg-slate-50">
      <header className="no-print border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
    type="button"
    onClick={onBack}
    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </button>
            <div>
              <h1 className="font-display text-lg font-bold text-slate-900">
                Delivery Personnel Location Reference
              </h1>
              <p className="text-xs text-slate-500">
                View-only schedule, statuses, and saved map reference prepared by Staff
              </p>
            </div>
          </div>
          <button
    type="button"
    onClick={() => window.print()}
    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
            <Printer className="h-4 w-4" />
            Print Delivery Sheet
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6 space-y-6">
        {!initialToken && <div className="no-print flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Assigned Delivery Personnel
              </label>
              <select
    value={personnelFilter}
    onChange={(e) => setPersonnelFilter(e.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                <option value="All">All Personnel</option>
                {roster.map((p) => <option key={p} value={p}>
                    {p}
                  </option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Delivery Status
              </label>
              <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Preparing">Preparing</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>}

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>}

        {loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading delivery schedule and map reference...
          </div> : deliveries.length === 0 ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No deliveries match the selected filters.
          </div> : <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-3">
              {deliveries.map((d) => {
    const balance = Math.max(0, Number(d.order_total || 0) - Number(d.amount_paid || 0));
    const isSelected = selectedDelivery?.id === d.id;
    return <button
      key={d.id}
      type="button"
      onClick={() => setSelectedDelivery(d)}
      className={`w-full text-left rounded-xl border p-4 transition-colors ${isSelected ? "border-sky-600 bg-sky-50/40" : "border-slate-200 bg-white hover:bg-slate-50"}`}
    >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900">
                        {d.delivery_no} · {d.order_no}
                      </span>
                      <span className={`text-xs font-semibold ${statusBadgeColor(d.status)}`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-slate-900">
                      {d.customer_name}
                    </div>
                    <div className="mt-1 text-xs text-slate-600">{d.address}</div>
                    {d.landmark_notes && <div className="mt-1 text-xs text-slate-500">
                        Landmark: {d.landmark_notes}
                      </div>}
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5 text-slate-400" />
                        {d.assigned_personnel}
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatDateTime(d.scheduled_datetime)}
                      </span>
                    </div>
                    {balance > 0 && d.status !== "Cancelled" && <div className="mt-2 text-xs font-semibold text-amber-700 font-mono tabular-nums">
                        Collect Balance: {formatCurrency(balance)} ({d.payment_status})
                      </div>}
                  </button>;
  })}
            </div>

            <div className="lg:col-span-7 space-y-4">
              {selectedDelivery && <div className="print-area rounded-xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-xs font-medium text-slate-500">
                        Selected Destination Reference
                      </div>
                      <h2 className="font-display text-lg font-bold text-slate-900">
                        {selectedDelivery.customer_name} ({selectedDelivery.delivery_no})
                      </h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Contact: <span className="font-mono">{selectedDelivery.customer_contact}</span> ·
                        Personnel: <span className="font-semibold">{selectedDelivery.assigned_personnel}</span>
                      </p>
                    </div>
                    <span
    className={`text-sm font-bold ${statusBadgeColor(selectedDelivery.status)}`}
  >
                      {selectedDelivery.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-semibold text-slate-700">Written Delivery Address</div>
                      <div className="mt-1 text-slate-800">{selectedDelivery.address}</div>
                      {selectedDelivery.barangay && <div className="text-slate-500">{selectedDelivery.barangay}</div>}
                      {selectedDelivery.landmark_notes && <div className="mt-1 text-slate-600">
                          Landmark: {selectedDelivery.landmark_notes}
                        </div>}
                      {selectedDelivery.lat && selectedDelivery.lng && <div className="mt-1 font-mono text-slate-500">
                          Coordinates: {selectedDelivery.lat.toFixed(5)}, {selectedDelivery.lng.toFixed(5)}
                        </div>}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-700">Order & Payment Summary</div>
                      <div className="mt-1 space-y-1">
                        {selectedDelivery.items?.map((it) => <div key={it.id} className="flex justify-between text-slate-700">
                            <span>
                              {it.quantity}× {it.product_name}
                            </span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(it.line_total)}
                            </span>
                          </div>)}
                        <div className="border-t border-slate-100 pt-1 flex justify-between font-semibold text-slate-900">
                          <span>Balance to Collect</span>
                          <span className="font-mono tabular-nums">
                            {formatCurrency(
    Math.max(
      0,
      Number(selectedDelivery.order_total || 0) - Number(selectedDelivery.amount_paid || 0)
    )
  )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="no-print">
                    <LocationMap
    centerLat={selectedDelivery.lat || station?.lat || 10.1935}
    centerLng={selectedDelivery.lng || station?.lng || 122.8586}
    zoom={15}
    pins={mapPins}
    heightClass="h-[360px]"
  />
                  </div>
                </div>}
            </div>
          </div>}
      </main>
    </div>;
};
export {
  DeliveryReferencePortal
};
