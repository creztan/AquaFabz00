import { useEffect, useState } from "react";
import { AlertTriangle, MapPin, Search, UserPlus, X } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { LocationMap } from "../LocationMap";

const QuickCustomerModal = ({
  open,
  onClose,
  onSelectedCustomer
}) => {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [customerType, setCustomerType] = useState("regular");
  const [includePin, setIncludePin] = useState(true);
  const [locLabel, setLocLabel] = useState("Primary Residence");
  const [barangay, setBarangay] = useState("Brgy. Poblacion");
  const [landmark, setLandmark] = useState("");
  const [pickedCoords, setPickedCoords] = useState({
    lat: 10.1935,
    lng: 122.8586
  });
  const [station, setStation] = useState(null);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [duplicateCustomer, setDuplicateCustomer] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setContact("");
    setAddress("");
    setCustomerType("regular");
    setIncludePin(true);
    setLocLabel("Primary Residence");
    setBarangay("Brgy. Poblacion");
    setLandmark("");
    setGeoQuery("");
    setGeoStatus("");
    setDuplicateCustomer(null);
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
  }, [open]);

  if (!open) return null;

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
        setGeoStatus("Location found. Drag the blue pin or click the map to fine-tune.");
      } else {
        setGeoStatus("No exact match found. Click on the map directly to place the delivery pin.");
      }
    } catch {
      setGeoStatus("Address lookup unavailable offline. Click on the map or enter coordinates manually.");
    }
  };

  const handleSubmit = async (forceCreate = false) => {
    setError("");
    setDuplicateCustomer(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        contact_number: contact.trim(),
        address: address.trim(),
        customer_type: customerType,
        forceCreate
      };
      if (includePin) {
        payload.locations = [
          {
            label: locLabel.trim() || "Primary Residence",
            address: address.trim(),
            barangay: barangay.trim() || "Brgy. Poblacion",
            landmark_notes: landmark.trim(),
            lat: pickedCoords.lat,
            lng: pickedCoords.lng
          }
        ];
      }
      const res = await apiFetch("/api/customers", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      onSelectedCustomer(res.customer, { isNew: true });
      onClose();
    } catch (err) {
      if (err?.status === 409 && err?.data?.existingCustomer) {
        setDuplicateCustomer(err.data.existingCustomer);
      } else {
        setError(err instanceof Error ? err.message : "Could not register customer.");
      }
    } finally {
      setSaving(false);
    }
  };

  const mapPins = station
    ? [
        {
          id: "station",
          label: station.name,
          sublabel: "Station Origin",
          address: station.address,
          lat: station.lat,
          lng: station.lng,
          kind: "station"
        }
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(false);
        }}
        className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl my-auto"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-sky-600" />
              Quick Register Customer Profile
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Staff-assisted registration (UC11). Saved directly without leaving your current transaction.
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

        {duplicateCustomer && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-2.5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                A matching customer already exists: <strong>{duplicateCustomer.name}</strong> (
                <span className="font-mono">{duplicateCustomer.contact_number}</span>). Select the existing customer or confirm creating a separate profile.
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectedCustomer(duplicateCustomer, { isNew: false });
                  onClose();
                }}
                className="rounded-md bg-white border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Use Existing Customer
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
              >
                Create Distinct Profile Anyway
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Clara Santos"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Number *
            </label>
            <input
              type="text"
              required
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="e.g. 0917-555-1234"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Primary Address *
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
              Customer Type
            </label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
            >
              <option value="regular">Regular</option>
              <option value="reseller">Reseller</option>
              <option value="walk-in">Walk-in</option>
            </select>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={includePin}
              onChange={(e) => setIncludePin(e.target.checked)}
              className="rounded border-slate-300 text-sky-600"
            />
            <MapPin className="h-3.5 w-3.5 text-sky-600" />
            Pin exact delivery coordinates on map (UC21)
          </label>

          {includePin && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pin Label
                  </label>
                  <input
                    type="text"
                    value={locLabel}
                    onChange={(e) => setLocLabel(e.target.value)}
                    placeholder="e.g. Residence, Store"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Barangay / Area
                  </label>
                  <input
                    type="text"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    placeholder="e.g. Brgy. Poblacion"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Landmark Notes
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Blue gate beside plaza"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

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
                  Locate
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
                heightClass="h-[230px]"
                interactivePick
                pickedCoords={pickedCoords}
                onPickCoords={(coords) => setPickedCoords(coords)}
              />

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required={includePin}
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
                    required={includePin}
                    value={pickedCoords.lng}
                    onChange={(e) =>
                      setPickedCoords({ ...pickedCoords, lng: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

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
            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Select Customer"}
          </button>
        </div>
      </form>
    </div>
  );
};

export { QuickCustomerModal };
