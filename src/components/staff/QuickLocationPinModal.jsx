import { useEffect, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { LocationMap } from "../LocationMap";

const QuickLocationPinModal = ({
  open,
  customer,
  onClose,
  onSavedLocation
}) => {
  const [label, setLabel] = useState("Delivery Location");
  const [barangay, setBarangay] = useState("Brgy. Poblacion");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [pickedCoords, setPickedCoords] = useState({
    lat: 10.1935,
    lng: 122.8586
  });
  const [station, setStation] = useState(null);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !customer) return;
    setLabel(customer.locations?.length ? "Secondary Address" : "Primary Residence");
    setBarangay("Brgy. Poblacion");
    setAddress(customer.locations?.length ? "" : customer.address || "");
    setLandmark("");
    setIsPrimary(!(customer.locations && customer.locations.length > 0));
    setGeoQuery("");
    setGeoStatus("");
    setError("");
    apiFetch("/api/station")
      .then((res) => {
        if (res?.station) {
          setStation(res.station);
          setPickedCoords({
            lat: Number((res.station.lat + 0.0012).toFixed(6)),
            lng: Number((res.station.lng + 0.001).toFixed(6))
          });
        }
      })
      .catch(() => {});
  }, [open, customer]);

  if (!open || !customer) return null;

  const handleLocate = async () => {
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
        setPickedCoords({ lat, lng });
        if (!address.trim()) {
          setAddress(results[0].display_name.split(",").slice(0, 3).join(", "));
        }
        setGeoStatus("Address located. Drag the blue pin or click the map to fine-tune.");
      } else {
        setGeoStatus("No automatic match found. Click on the map directly to drop the delivery pin.");
      }
    } catch {
      setGeoStatus("Address lookup unavailable offline. Click on the map or enter coordinates manually.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await apiFetch(`/api/customers/${customer.id}/locations`, {
        method: "POST",
        body: JSON.stringify({
          label: label.trim(),
          address: address.trim(),
          barangay: barangay.trim(),
          landmark_notes: landmark.trim(),
          lat: pickedCoords.lat,
          lng: pickedCoords.lng,
          is_primary: isPrimary
        })
      });
      onSavedLocation(res.location);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save delivery location.");
    } finally {
      setSaving(false);
    }
  };

  const mapPins = [];
  if (station) {
    mapPins.push({
      id: "station",
      label: station.name,
      sublabel: "Station Origin",
      address: station.address,
      lat: station.lat,
      lng: station.lng,
      kind: "station"
    });
  }
  (customer.locations || []).forEach((loc) => {
    mapPins.push({
      id: loc.id,
      label: `${customer.name} (${loc.label})`,
      sublabel: loc.barangay,
      address: loc.address,
      landmark: loc.landmark_notes,
      lat: loc.lat,
      lng: loc.lng,
      kind: "customer"
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl my-auto"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-600" />
              Add Delivery Location Pin — {customer.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click the map or search an address to save a delivery pin (UC21) directly for this order.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Location Label *
            </label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Home, Store, Branch"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Barangay / Area *
            </label>
            <input
              type="text"
              required
              value={barangay}
              onChange={(e) => setBarangay(e.target.value)}
              placeholder="e.g. Brgy. San Pedro"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Street / Written Address *
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House #, Purok, Street, Barangay"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Landmark Notes
            </label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Yellow gate beside bakery"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>
        </div>

        <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={geoQuery}
                onChange={(e) => setGeoQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLocate();
                  }
                }}
                placeholder="Search Binalbagan street or barangay..."
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleLocate}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Locate Address
            </button>
          </div>

          {geoStatus && (
            <div className="text-[11px] text-slate-600">{geoStatus}</div>
          )}

          <LocationMap
            centerLat={pickedCoords.lat}
            centerLng={pickedCoords.lng}
            zoom={15}
            pins={mapPins}
            heightClass="h-[240px]"
            interactivePick
            pickedCoords={pickedCoords}
            onPickCoords={(coords) => setPickedCoords(coords)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                required
                value={pickedCoords.lat}
                onChange={(e) =>
                  setPickedCoords({ ...pickedCoords, lat: Number(e.target.value) })
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
                value={pickedCoords.lng}
                onChange={(e) =>
                  setPickedCoords({ ...pickedCoords, lng: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums"
              />
            </div>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={isPrimary}
            onChange={(e) => setIsPrimary(e.target.checked)}
            className="rounded border-slate-300 text-sky-600"
          />
          Set as primary delivery address
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            <MapPin className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save & Use Delivery Pin"}
          </button>
        </div>
      </form>
    </div>
  );
};

export { QuickLocationPinModal };
