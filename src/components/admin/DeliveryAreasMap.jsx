import { useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { LocationMap } from "../LocationMap";
const DeliveryAreasMap = () => {
  const [data, setData] = useState(null);
  const [barangay, setBarangay] = useState("All");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [highlightFrequent, setHighlightFrequent] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (barangay !== "All") params.set("barangay", barangay);
        if (pendingOnly) params.set("pendingOnly", "true");
        const res = await apiFetch(
          `/api/admin/delivery-areas?${params.toString()}`
        );
        setData(res);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [barangay, pendingOnly]);
  const station = data?.station || { name: "Aqua Fabz Station", address: "Binalbagan", lat: 10.1935, lng: 122.8586 };
  const locations = data?.locations || [];
  const allBarangays = data?.allBarangays || [];
  const areaFrequency = data?.areaFrequency || [];

  const pins = useMemo(() => {
    if (!data) return [];
    const list = [
      {
        id: "station",
        label: station.name,
        sublabel: "Station HQ",
        address: station.address,
        lat: station.lat,
        lng: station.lng,
        kind: "station"
      }
    ];
    locations.forEach((loc) => {
      const isFrequent = highlightFrequent && loc.delivery_count >= 2;
      const isPending = loc.open_orders_count > 0;
      list.push({
        id: loc.id,
        label: `${loc.customer_name} (${loc.label})`,
        sublabel: `${loc.barangay} \xB7 ${loc.delivery_count} deliveries \xB7 ${loc.open_orders_count} open orders`,
        address: loc.address,
        barangay: loc.barangay,
        landmark: loc.landmark_notes,
        lat: loc.lat,
        lng: loc.lng,
        kind: isPending ? "pending" : isFrequent ? "frequent" : "customer",
        deliveryCount: loc.delivery_count,
        openOrdersCount: loc.open_orders_count
      });
    });
    return list;
  }, [data, station, locations, highlightFrequent]);
  return <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Delivery Area Monitoring
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View saved customer locations around Aqua Fabz Station and identify areas with frequent deliveries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
    value={barangay}
    onChange={(e) => setBarangay(e.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
            <option value="All">All Barangays / Areas</option>
            {allBarangays.map((b) => <option key={b} value={b}>
                {b}
              </option>)}
          </select>

          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 cursor-pointer">
            <input
    type="checkbox"
    checked={pendingOnly}
    onChange={(e) => setPendingOnly(e.target.checked)}
    className="rounded border-slate-300 text-sky-600"
  />
            Pending Deliveries Only
          </label>

          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 cursor-pointer">
            <input
    type="checkbox"
    checked={highlightFrequent}
    onChange={(e) => setHighlightFrequent(e.target.checked)}
    className="rounded border-slate-300 text-sky-600"
  />
            Highlight Frequent Areas
          </label>
        </div>
      </div>

      {loading || !data ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading delivery area map...
        </div> : <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-4">
            {locations.length === 0 ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                No customer locations match the selected filter.
              </div> : <LocationMap
    centerLat={station.lat}
    centerLng={station.lng}
    zoom={14}
    pins={pins}
    heightClass="h-[460px]"
    selectedPinId={selectedPin?.id ?? null}
    onSelectPin={(pin) => setSelectedPin(pin)}
  />}
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-slate-900">Selected Pin Details</h2>
              {selectedPin ? <div className="mt-3 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900">{selectedPin.label}</div>
                  {selectedPin.sublabel && <div className="text-slate-600">{selectedPin.sublabel}</div>}
                  <div className="text-slate-700">{selectedPin.address}</div>
                  {selectedPin.landmark && <div className="text-slate-500">Landmark: {selectedPin.landmark}</div>}
                  <div className="font-mono text-[11px] text-slate-500">
                    {selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}
                  </div>
                </div> : <p className="mt-2 text-xs text-slate-500">
                  Click any map pin to inspect customer address, delivery frequency, and open orders.
                </p>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-slate-900">
                  Delivery Frequency by Area
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {areaFrequency.map((area) => <div
    key={area.barangay}
    className="flex items-center justify-between px-5 py-3 text-xs"
  >
                    <div>
                      <div className="font-medium text-slate-900">{area.barangay}</div>
                      <div className="text-slate-500">{area.locations} saved pins</div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span
    className={`font-semibold ${area.deliveries >= 2 ? "text-red-700" : "text-slate-900"}`}
  >
                        {area.deliveries} deliveries
                      </span>
                    </div>
                  </div>)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-800 mb-2">
                Written Addresses ({locations.length})
              </h3>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                {locations.map((loc) => <button
    key={loc.id}
    type="button"
    onClick={() => {
      const found = pins.find((p) => p.id === loc.id);
      if (found) setSelectedPin(found);
    }}
    className="w-full py-2 text-left hover:bg-slate-50 flex items-start gap-2"
  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900">{loc.customer_name}</div>
                      <div className="text-slate-500">{loc.address}</div>
                    </div>
                  </button>)}
              </div>
            </div>
          </div>
        </div>}
    </div>;
};
export {
  DeliveryAreasMap
};
