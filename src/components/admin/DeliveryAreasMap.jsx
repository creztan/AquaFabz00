import { useEffect, useMemo, useState } from "react";
import { Edit2, MapPin, Search, X } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { LocationMap } from "../LocationMap";

const DeliveryAreasMap = () => {
  const [data, setData] = useState(null);
  const [barangay, setBarangay] = useState("All");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [highlightFrequent, setHighlightFrequent] = useState(true);
  const [selectedPin, setSelectedPin] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editingStation, setEditingStation] = useState(false);
  const [stationName, setStationName] = useState("");
  const [stationAddress, setStationAddress] = useState("");
  const [stationBarangay, setStationBarangay] = useState("");
  const [stationContact, setStationContact] = useState("");
  const [pickedStationCoords, setPickedStationCoords] = useState({
    lat: 10.1935,
    lng: 122.8586
  });
  const [geoQuery, setGeoQuery] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [stationErr, setStationErr] = useState("");
  const [stationSuccess, setStationSuccess] = useState("");
  const [savingStation, setSavingStation] = useState(false);

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
    } catch (err) {
      setStationErr(err instanceof Error ? err.message : "Unable to load delivery area map.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [barangay, pendingOnly]);

  const station = data?.station || {
    name: "Aqua Fabz Station",
    address: "Binalbagan",
    barangay: "Brgy. Poblacion",
    contact: "0917-555-0148",
    lat: 10.1935,
    lng: 122.8586
  };
  const locations = data?.locations || [];
  const allBarangays = data?.allBarangays || [];
  const areaFrequency = data?.areaFrequency || [];

  const openEditStation = () => {
    setStationName(station.name || "Aqua Fabz Water Refilling Station");
    setStationAddress(station.address || "");
    setStationBarangay(station.barangay || "Brgy. Poblacion");
    setStationContact(station.contact || "");
    setPickedStationCoords({
      lat: Number(station.lat || 10.1935),
      lng: Number(station.lng || 122.8586)
    });
    setGeoQuery("");
    setGeoStatus("");
    setStationErr("");
    setStationSuccess("");
    setEditingStation(true);
  };

  const handleLocateStation = async () => {
    if (!geoQuery.trim()) return;
    setGeoStatus("Searching address...");
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          `${geoQuery}, Binalbagan, Negros Occidental, Philippines`
        )}&limit=1`
      );
      const results = await resp.json();
      if (results.length > 0) {
        const lat = Number(Number(results[0].lat).toFixed(6));
        const lng = Number(Number(results[0].lon).toFixed(6));
        setPickedStationCoords({ lat, lng });
        setGeoStatus("Address located. Click the map or drag the blue pin to fine-tune the station HQ.");
      } else {
        setGeoStatus("No automatic match found. Click directly on the map or type Lat/Lng below.");
      }
    } catch {
      setGeoStatus("Lookup unavailable offline. Click directly on the map or type Lat/Lng below.");
    }
  };

  const handleSaveStation = async (e) => {
    e.preventDefault();
    setStationErr("");
    setStationSuccess("");
    setSavingStation(true);
    try {
      const res = await apiFetch("/api/station", {
        method: "PUT",
        body: JSON.stringify({
          name: stationName.trim(),
          address: stationAddress.trim(),
          barangay: stationBarangay.trim(),
          contact: stationContact.trim(),
          lat: pickedStationCoords.lat,
          lng: pickedStationCoords.lng
        })
      });
      setEditingStation(false);
      setStationSuccess(
        `Updated station location to ${res.station.address} (${Number(res.station.lat).toFixed(5)}, ${Number(res.station.lng).toFixed(5)}).`
      );
      await load();
    } catch (err) {
      setStationErr(err instanceof Error ? err.message : "Unable to update station location.");
    } finally {
      setSavingStation(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Delivery Area Monitoring
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View saved customer locations around Aqua Fabz Station, identify frequent delivery areas, and adjust the Station HQ pin if needed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openEditStation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Edit2 className="h-3.5 w-3.5 text-sky-600" />
            Move / Edit Station Location
          </button>

          <select
            value={barangay}
            onChange={(e) => setBarangay(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
          >
            <option value="All">All Barangays / Areas</option>
            {allBarangays.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
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

      {stationSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {stationSuccess}
        </div>
      )}

      {editingStation && (
        <form
          onSubmit={handleSaveStation}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Update Main Station Location (AF Station HQ)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click anywhere on the map or drag the blue pin to move Aqua Fabz Station. This updates the Station pin across all maps, the public landing page, and delivery references.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingStation(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close station editor"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {stationErr && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {stationErr}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Station Name *
              </label>
              <input
                type="text"
                required
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                required
                value={stationAddress}
                onChange={(e) => setStationAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Barangay
              </label>
              <input
                type="text"
                value={stationBarangay}
                onChange={(e) => setStationBarangay(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number
              </label>
              <input
                type="text"
                value={stationContact}
                onChange={(e) => setStationContact(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-sky-600" />
                Click map or drag the blue pin to set new Station HQ coordinates
              </div>
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={geoQuery}
                    onChange={(e) => setGeoQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLocateStation();
                      }
                    }}
                    placeholder="Search Binalbagan street or barangay..."
                    className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLocateStation}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Locate
                </button>
              </div>
            </div>

            {geoStatus && <div className="text-[11px] text-slate-600">{geoStatus}</div>}

            <LocationMap
              centerLat={pickedStationCoords.lat}
              centerLng={pickedStationCoords.lng}
              zoom={15}
              pins={pins}
              heightClass="h-[280px]"
              interactivePick
              pickedCoords={pickedStationCoords}
              onPickCoords={(coords) => setPickedStationCoords(coords)}
            />

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={pickedStationCoords.lat}
                  onChange={(e) =>
                    setPickedStationCoords({ ...pickedStationCoords, lat: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={pickedStationCoords.lng}
                  onChange={(e) =>
                    setPickedStationCoords({ ...pickedStationCoords, lng: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingStation(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingStation}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {savingStation ? "Saving..." : "Save Station Location"}
            </button>
          </div>
        </form>
      )}

      {loading || !data ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading delivery area map...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-4">
            <LocationMap
              centerLat={station.lat}
              centerLng={station.lng}
              zoom={14}
              pins={pins}
              heightClass="h-[460px]"
              selectedPinId={selectedPin?.id ?? null}
              onSelectPin={(pin) => setSelectedPin(pin)}
            />
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Selected Pin Details</h2>
                <button
                  type="button"
                  onClick={openEditStation}
                  className="text-[11px] font-semibold text-sky-700 hover:underline"
                >
                  Edit Station HQ
                </button>
              </div>
              {selectedPin ? (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="font-semibold text-slate-900">{selectedPin.label}</div>
                  {selectedPin.sublabel && (
                    <div className="text-slate-600">{selectedPin.sublabel}</div>
                  )}
                  <div className="text-slate-700">{selectedPin.address}</div>
                  {selectedPin.landmark && (
                    <div className="text-slate-500">Landmark: {selectedPin.landmark}</div>
                  )}
                  <div className="font-mono text-[11px] text-slate-500">
                    {selectedPin.lat.toFixed(5)}, {selectedPin.lng.toFixed(5)}
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5 text-xs text-slate-500">
                  <p>
                    Click any map pin to inspect customer address, delivery frequency, and open orders.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Station HQ: {station.address} ({Number(station.lat).toFixed(4)}, {Number(station.lng).toFixed(4)})
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-sm font-semibold text-slate-900">
                  Delivery Frequency by Area
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {areaFrequency.map((area) => (
                  <div
                    key={area.barangay}
                    className="flex items-center justify-between px-5 py-3 text-xs"
                  >
                    <div>
                      <div className="font-medium text-slate-900">{area.barangay}</div>
                      <div className="text-slate-500">{area.locations} saved pins</div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span
                        className={`font-semibold ${
                          area.deliveries >= 2 ? "text-red-700" : "text-slate-900"
                        }`}
                      >
                        {area.deliveries} deliveries
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-xs font-semibold text-slate-800 mb-2">
                Written Addresses ({locations.length})
              </h3>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 text-xs">
                {locations.length === 0 ? (
                  <div className="py-3 text-slate-500">
                    No customer locations match the selected filter.
                  </div>
                ) : (
                  locations.map((loc) => (
                    <button
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
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { DeliveryAreasMap };
