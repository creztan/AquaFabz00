import { useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Search, Trash2 } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { LocationMap } from "../LocationMap";
const LocationMappingView = ({
  initialCustomerId = null
}) => {
  const [station, setStation] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(
    initialCustomerId ? String(initialCustomerId) : ""
  );
  const [editingLoc, setEditingLoc] = useState(null);
  const [label, setLabel] = useState("Residence");
  const [address, setAddress] = useState("");
  const [barangay, setBarangay] = useState("Brgy. Poblacion");
  const [landmark, setLandmark] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [pickedCoords, setPickedCoords] = useState({
    lat: 10.1935,
    lng: 122.8586
  });
  const [geoQuery, setGeoQuery] = useState("");
  const [geoStatus, setGeoStatus] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const loadData = async () => {
    const [stRes, custRes] = await Promise.all([
      apiFetch("/api/station"),
      apiFetch("/api/customers")
    ]);
    setStation(stRes.station);
    setCustomers(custRes.customers);
    if (!selectedCustomerId && custRes.customers.length > 0) {
      setSelectedCustomerId(String(initialCustomerId || custRes.customers[0].id));
    }
  };
  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(String(initialCustomerId));
    }
  }, [initialCustomerId]);
  const selectedCustomer = customers.find((c) => String(c.id) === String(selectedCustomerId));
  const mapPins = useMemo(() => {
    const list = [];
    if (station) {
      list.push({
        id: "station",
        label: station.name,
        sublabel: "Station Origin",
        address: station.address,
        lat: station.lat,
        lng: station.lng,
        kind: "station"
      });
    }
    customers.forEach((c) => {
      c.locations?.forEach((loc) => {
        list.push({
          id: loc.id,
          label: `${c.name} (${loc.label})`,
          sublabel: loc.barangay,
          address: loc.address,
          barangay: loc.barangay,
          landmark: loc.landmark_notes,
          lat: loc.lat,
          lng: loc.lng,
          kind: String(c.id) === String(selectedCustomerId) ? "pending" : "customer"
        });
      });
    });
    return list;
  }, [station, customers, selectedCustomerId]);
  const handleSearchAddress = async () => {
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
        const lat = Number(results[0].lat);
        const lng = Number(results[0].lon);
        setPickedCoords({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
        if (!address) setAddress(results[0].display_name.split(",").slice(0, 3).join(", "));
        setGeoStatus("Address located. You may drag the blue pin to fine-tune the position.");
      } else {
        setGeoStatus("Address not found automatically. Click directly on the map to place the pin manually and add landmark notes.");
      }
    } catch {
      setGeoStatus("Address lookup unavailable offline. Click directly on the map or enter coordinates manually.");
    }
  };
  const resetForm = () => {
    setEditingLoc(null);
    setLabel("Delivery Location");
    setAddress("");
    setBarangay("Brgy. Poblacion");
    setLandmark("");
    setIsPrimary(false);
    setPickedCoords({ lat: station?.lat || 10.1935, lng: station?.lng || 122.8586 });
  };
  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setError("");
    setSuccess("");
    try {
      if (editingLoc) {
        await apiFetch(`/api/locations/${editingLoc.id}`, {
          method: "PUT",
          body: JSON.stringify({
            label,
            address,
            barangay,
            landmark_notes: landmark,
            lat: pickedCoords.lat,
            lng: pickedCoords.lng,
            is_primary: isPrimary
          })
        });
        setSuccess(`Updated "${label}" pin for ${selectedCustomer.name}.`);
      } else {
        await apiFetch(`/api/customers/${selectedCustomer.id}/locations`, {
          method: "POST",
          body: JSON.stringify({
            label,
            address,
            barangay,
            landmark_notes: landmark,
            lat: pickedCoords.lat,
            lng: pickedCoords.lng,
            is_primary: isPrimary
          })
        });
        setSuccess(`Saved new delivery pin "${label}" for ${selectedCustomer.name}.`);
      }
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save location.");
    }
  };
  const handleDeleteLocation = async (locId) => {
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/locations/${locId}`, { method: "DELETE" });
      setSuccess("Delivery location removed.");
      if (editingLoc?.id === locId) resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot delete location.");
    }
  };
  return <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Map & Manage Customer Locations
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Search an address or click directly on the map to place a pin, drag to adjust coordinates, and save multiple delivery addresses per customer.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {
    /* Left Form & Customer Locations */
  }
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Customer Profile
              </label>
              <select
    value={selectedCustomerId}
    onChange={(e) => {
      setSelectedCustomerId(e.target.value);
      resetForm();
    }}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                {customers.map((c) => <option key={c.id} value={c.id}>
                    {c.name} ({c.locations?.length || 0} pins)
                  </option>)}
              </select>
            </div>

            {selectedCustomer && <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Saved Delivery Addresses
                  </span>
                  <button
    type="button"
    onClick={resetForm}
    className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
  >
                    <Plus className="h-3.5 w-3.5" /> Add Another
                  </button>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {selectedCustomer.locations?.map((loc) => <div key={loc.id} className="py-2 flex items-start justify-between gap-2">
                      <button
    type="button"
    onClick={() => {
      setEditingLoc(loc);
      setLabel(loc.label);
      setAddress(loc.address);
      setBarangay(loc.barangay);
      setLandmark(loc.landmark_notes);
      setIsPrimary(loc.is_primary === 1);
      setPickedCoords({ lat: loc.lat, lng: loc.lng });
    }}
    className="text-left flex-1 hover:text-sky-700"
  >
                        <div className="font-semibold text-slate-900">
                          {loc.label}
                          {loc.is_primary === 1 && <span className="ml-1.5 text-[11px] font-normal text-sky-700">
                              · Primary
                            </span>}
                        </div>
                        <div className="text-slate-600">{loc.address}</div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                        </div>
                      </button>
                      <button
    type="button"
    onClick={() => handleDeleteLocation(loc.id)}
    className="p-1 text-slate-400 hover:text-red-600"
    title="Remove location"
  >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>)}
                </div>
              </div>}
          </div>

          <form
    onSubmit={handleSaveLocation}
    className="rounded-xl border border-slate-200 bg-white p-5 space-y-3.5"
  >
            <h2 className="text-sm font-semibold text-slate-900">
              {editingLoc ? `Edit Pin \u2014 ${editingLoc.label}` : "Set New Delivery Location Pin"}
            </h2>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>}
            {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {success}
              </div>}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location Label
                </label>
                <input
    type="text"
    required
    value={label}
    onChange={(e) => setLabel(e.target.value)}
    placeholder="e.g. Home, Store"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Barangay / Area
                </label>
                <input
    type="text"
    required
    value={barangay}
    onChange={(e) => setBarangay(e.target.value)}
    placeholder="e.g. Brgy. San Pedro"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Street / Written Address
              </label>
              <input
    type="text"
    required
    value={address}
    onChange={(e) => setAddress(e.target.value)}
    placeholder="House #, Purok, Street, Barangay"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
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
    placeholder="e.g. Blue gate beside sari-sari store"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
  />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Latitude
                </label>
                <input
    type="number"
    step="0.000001"
    required
    value={pickedCoords.lat}
    onChange={(e) => setPickedCoords({ ...pickedCoords, lat: Number(e.target.value) })}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Longitude
                </label>
                <input
    type="number"
    step="0.000001"
    required
    value={pickedCoords.lng}
    onChange={(e) => setPickedCoords({ ...pickedCoords, lng: Number(e.target.value) })}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
  />
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
    type="checkbox"
    checked={isPrimary}
    onChange={(e) => setIsPrimary(e.target.checked)}
    className="rounded border-slate-300 text-sky-600"
  />
              Set as primary delivery address
            </label>

            <button
    type="submit"
    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
  >
              <MapPin className="h-4 w-4" />
              {editingLoc ? "Save Pin Changes" : "Save Customer Location Pin"}
            </button>
          </form>
        </div>

        {
    /* Right Interactive Map */
  }
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
    type="text"
    value={geoQuery}
    onChange={(e) => setGeoQuery(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearchAddress();
      }
    }}
    placeholder="Search Binalbagan street or barangay..."
    className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs"
  />
            </div>
            <button
    type="button"
    onClick={handleSearchAddress}
    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
  >
              Locate Address
            </button>
          </div>

          {geoStatus && <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
              {geoStatus}
            </div>}

          <p className="text-xs text-slate-500">
            Click anywhere on the map to place the blue pin, or drag the blue pin to fine-tune the exact delivery coordinates.
          </p>

          <LocationMap
    centerLat={pickedCoords.lat}
    centerLng={pickedCoords.lng}
    zoom={15}
    pins={mapPins}
    heightClass="h-[480px]"
    interactivePick
    pickedCoords={pickedCoords}
    onPickCoords={(coords) => setPickedCoords(coords)}
  />
        </div>
      </div>
    </div>;
};
export {
  LocationMappingView
};
