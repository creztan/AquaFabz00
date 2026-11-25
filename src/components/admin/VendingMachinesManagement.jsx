import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Edit2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
  XCircle
} from "lucide-react";
import { apiFetch, formatCurrency, formatDate } from "../../lib/api";
import { LocationMap } from "../LocationMap";

const STATUS_OPTIONS = [
  { value: "operational", label: "Working / Operational", shortLabel: "Operational" },
  { value: "maintenance", label: "On Maintenance", shortLabel: "On Maintenance" },
  { value: "out_of_service", label: "Out of Service (No Longer Used)", shortLabel: "Out of Service" }
];

function statusStyle(status) {
  switch (status) {
    case "operational":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "maintenance":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "out_of_service":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

const VendingMachinesManagement = () => {
  const [machines, setMachines] = useState([]);
  const [station, setStation] = useState({
    name: "Aqua Fabz Water Refilling Station",
    address: "Rizal St., Brgy. Poblacion, Binalbagan, Negros Occidental",
    lat: 10.1935,
    lng: 122.8586
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [locationName, setLocationName] = useState("");
  const [barangay, setBarangay] = useState("Brgy. Poblacion");
  const [status, setStatus] = useState("operational");
  const [pricePerLiter, setPricePerLiter] = useState("2.00");
  const [waterCapacity, setWaterCapacity] = useState("500");
  const [currentWaterLevel, setCurrentWaterLevel] = useState("500");
  const [coinCapacity, setCoinCapacity] = useState("5000");
  const [notes, setNotes] = useState("");
  const [pickedCoords, setPickedCoords] = useState({ lat: 10.1935, lng: 122.8586 });

  const [geoQuery, setGeoQuery] = useState("");
  const [geoStatus, setGeoStatus] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vmRes, stRes] = await Promise.all([
        apiFetch("/api/vending-machines"),
        apiFetch("/api/station").catch(() => null)
      ]);
      setMachines(Array.isArray(vmRes.machines) ? vmRes.machines : []);
      if (stRes?.station) {
        setStation(stRes.station);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load vending machines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const counts = useMemo(() => {
    return {
      all: machines.length,
      operational: machines.filter((m) => m.status === "operational").length,
      maintenance: machines.filter((m) => m.status === "maintenance").length,
      out_of_service: machines.filter((m) => m.status === "out_of_service").length
    };
  }, [machines]);

  const filteredMachines = useMemo(() => {
    if (statusFilter === "all") return machines;
    return machines.filter((m) => m.status === statusFilter);
  }, [machines, statusFilter]);

  const openAdd = () => {
    const nextNum = String(machines.length + 1).padStart(2, "0");
    setEditing(null);
    setCode(`VND-BIN-${nextNum}`);
    setName("");
    setLocationName("");
    setBarangay("Brgy. Poblacion");
    setStatus("operational");
    setPricePerLiter("2.00");
    setWaterCapacity("500");
    setCurrentWaterLevel("500");
    setCoinCapacity("5000");
    setNotes("");
    setPickedCoords({
      lat: Number((Number(station.lat || 10.1935) + 0.0008).toFixed(6)),
      lng: Number((Number(station.lng || 122.8586) + 0.0008).toFixed(6))
    });
    setGeoQuery("");
    setGeoStatus("");
    setError("");
    setShowForm(true);
  };

  const openEdit = (vm) => {
    setEditing(vm);
    setCode(vm.code || "");
    setName(vm.name || "");
    setLocationName(vm.location_name || "");
    setBarangay(vm.barangay || "Brgy. Poblacion");
    setStatus(vm.status || "operational");
    setPricePerLiter(String(vm.price_per_liter ?? 2));
    setWaterCapacity(String(vm.water_capacity_liters ?? 500));
    setCurrentWaterLevel(String(vm.current_water_level_liters ?? 500));
    setCoinCapacity(String(vm.coin_capacity ?? 5000));
    setNotes(vm.notes || "");
    setPickedCoords({
      lat: Number(vm.lat ?? station.lat ?? 10.1935),
      lng: Number(vm.lng ?? station.lng ?? 122.8586)
    });
    setGeoQuery("");
    setGeoStatus("");
    setError("");
    setShowForm(true);
  };

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
        if (!locationName.trim()) {
          setLocationName(results[0].display_name.split(",").slice(0, 2).join(", "));
        }
        setGeoStatus("Location found. Click the map or drag the pin to fine-tune.");
      } else {
        setGeoStatus("No match found. Click directly on the map to place the machine pin.");
      }
    } catch {
      setGeoStatus("Lookup unavailable offline. Click on the map or enter coordinates manually.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const numPrice = Number(pricePerLiter);
    const numCap = Number(waterCapacity);
    const numLevel = Number(currentWaterLevel);
    const numCoinCap = Number(coinCapacity);

    if (Number.isNaN(numPrice) || numPrice <= 0) {
      setError("Price per liter must be greater than zero.");
      return;
    }
    if (Number.isNaN(numCap) || numCap <= 0) {
      setError("Water tank capacity must be greater than zero.");
      return;
    }
    if (Number.isNaN(numLevel) || numLevel < 0) {
      setError("Current water level must be zero or greater.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: code.trim(),
        name: name.trim(),
        location_name: locationName.trim(),
        barangay: barangay.trim(),
        status,
        price_per_liter: numPrice,
        water_capacity_liters: numCap,
        current_water_level_liters: numLevel,
        coin_capacity: Number.isNaN(numCoinCap) ? 5000 : numCoinCap,
        lat: pickedCoords.lat,
        lng: pickedCoords.lng,
        notes: notes.trim()
      };

      if (editing) {
        await apiFetch(`/api/vending-machines/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setSuccess(`Updated vending machine "${payload.name}" (${payload.code}).`);
      } else {
        await apiFetch("/api/vending-machines", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setSuccess(`Added vending machine "${payload.name}" (${payload.code}).`);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save vending machine.");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (vm, nextStatus) => {
    if (vm.status === nextStatus) return;
    setError("");
    setSuccess("");
    try {
      await apiFetch(`/api/vending-machines/${vm.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      const label = STATUS_OPTIONS.find((s) => s.value === nextStatus)?.shortLabel || nextStatus;
      setSuccess(`Updated "${vm.name}" status to ${label}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update machine status.");
    }
  };

  const openDeleteModal = (vm) => {
    setDeleteTarget(vm);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError("");
    setDeleting(true);
    try {
      await apiFetch(`/api/vending-machines/${deleteTarget.id}`, {
        method: "DELETE"
      });
      setSuccess(`Deleted vending machine "${deleteTarget.name}" (${deleteTarget.code}).`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unable to delete vending machine.");
    } finally {
      setDeleting(false);
    }
  };

  const markOutOfServiceFromModal = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await apiFetch(`/api/vending-machines/${deleteTarget.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "out_of_service" })
      });
      setSuccess(
        `Marked "${deleteTarget.name}" as Out of Service. Existing collection history is preserved.`
      );
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Unable to update status.");
    } finally {
      setDeleting(false);
    }
  };

  const formMapPins = useMemo(() => {
    const pins = [
      {
        id: "station",
        label: station.name,
        sublabel: "Main Station",
        address: station.address,
        lat: Number(station.lat || 10.1935),
        lng: Number(station.lng || 122.8586),
        kind: "station"
      }
    ];
    machines
      .filter((m) => !editing || m.id !== editing.id)
      .forEach((m) => {
        pins.push({
          id: m.id,
          label: `${m.code} · ${m.name}`,
          sublabel: m.barangay,
          address: m.location_name,
          lat: Number(m.lat),
          lng: Number(m.lng),
          kind: "vending"
        });
      });
    return pins;
  }, [station, machines, editing]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Vending Machines Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Register station-owned water vending units, pin their Binalbagan locations, and manage operational, maintenance, or out-of-service status.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
        >
          <Plus className="h-4 w-4" />
          Add Vending Machine
        </button>
      </div>

      {/* Status Filter Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { id: "all", label: "All Units", count: counts.all, icon: Coins, tone: "text-slate-900" },
          { id: "operational", label: "Working / Operational", count: counts.operational, icon: CheckCircle2, tone: "text-emerald-700" },
          { id: "maintenance", label: "On Maintenance", count: counts.maintenance, icon: Wrench, tone: "text-amber-700" },
          { id: "out_of_service", label: "Out of Service", count: counts.out_of_service, icon: XCircle, tone: "text-red-700" }
        ].map((card) => {
          const Icon = card.icon;
          const active = statusFilter === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setStatusFilter(card.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                active
                  ? "border-sky-500 bg-sky-50/50 ring-1 ring-sky-500"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{card.label}</span>
                <Icon className={`h-4 w-4 ${card.tone}`} />
              </div>
              <div className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${card.tone}`}>
                {card.count}
              </div>
            </button>
          );
        })}
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {success}
        </div>
      )}

      {error && !showForm && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Add / Edit Vending Machine Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-white p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {editing ? `Edit Vending Machine — ${editing.code}` : "Register New Vending Machine"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All fields map directly to the station&apos;s vending machine records.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close form"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Machine Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. VND-BIN-04"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Machine Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aqua Fabz Vendo #4 — San Pedro"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operational Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Location / Landmark Name *
              </label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Outside San Pedro Barangay Hall"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Barangay *
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price per Liter (₱) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tank Capacity (Liters) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={waterCapacity}
                onChange={(e) => setWaterCapacity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Water Level (Liters) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={currentWaterLevel}
                onChange={(e) => setCurrentWaterLevel(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Coin Box Capacity (₱)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={coinCapacity}
                onChange={(e) => setCoinCapacity(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Maintenance / Placement Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Filter replaced last week or scheduled for valve inspection"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>

          {/* Interactive Map Picker */}
          <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-sky-600" />
                Vending Machine Map Location (Click map or drag blue pin)
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
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  Locate
                </button>
              </div>
            </div>

            {geoStatus && <div className="text-[11px] text-slate-600">{geoStatus}</div>}

            <LocationMap
              centerLat={pickedCoords.lat}
              centerLng={pickedCoords.lng}
              zoom={15}
              pins={formMapPins}
              heightClass="h-[260px]"
              interactivePick
              pickedCoords={pickedCoords}
              onPickCoords={(coords) => setPickedCoords(coords)}
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

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editing
                  ? "Save Machine Changes"
                  : "Create Vending Machine"}
            </button>
          </div>
        </form>
      )}

      {/* Machines Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading vending machines...
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No vending machines match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Machine</th>
                  <th className="px-5 py-3 font-semibold">Location & Barangay</th>
                  <th className="px-5 py-3 font-semibold">Water Level & Rate</th>
                  <th className="px-5 py-3 text-right font-semibold">Lifetime Sales</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMachines.map((vm) => {
                  const pct = vm.water_capacity_liters
                    ? Math.min(
                        100,
                        Math.round(
                          (Number(vm.current_water_level_liters || 0) /
                            Number(vm.water_capacity_liters)) *
                            100
                        )
                      )
                    : 0;
                  const isOut = vm.status === "out_of_service";
                  return (
                    <tr
                      key={vm.id}
                      className={isOut ? "bg-slate-50/70 text-slate-500" : "hover:bg-slate-50"}
                    >
                      <td className="px-5 py-3.5 align-top">
                        <div className="font-mono text-[11px] font-semibold text-sky-700">
                          {vm.code}
                        </div>
                        <div className="font-semibold text-slate-900 mt-0.5">{vm.name}</div>
                        {vm.notes && (
                          <div className="mt-1 text-[11px] text-slate-500 max-w-xs">
                            {vm.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="font-medium text-slate-800">{vm.location_name}</div>
                        <div className="text-[11px] text-slate-500">{vm.barangay}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                          {Number(vm.lat).toFixed(4)}, {Number(vm.lng).toFixed(4)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="font-mono font-semibold text-slate-900 tabular-nums">
                          {vm.current_water_level_liters} / {vm.water_capacity_liters} L
                        </div>
                        <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              vm.current_water_level_liters <= 100
                                ? "bg-amber-500"
                                : "bg-sky-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500 font-mono">
                          {formatCurrency(vm.price_per_liter)} / L
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top text-right">
                        <div className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatCurrency(vm.total_lifetime_sales)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {vm.sales_count || 0} collection{vm.sales_count === 1 ? "" : "s"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Serviced: {formatDate(vm.last_serviced)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <select
                          aria-label={`Status for ${vm.name}`}
                          value={vm.status}
                          onChange={(e) => handleStatusChange(vm, e.target.value)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold focus:outline-none ${statusStyle(
                            vm.status
                          )}`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                              {opt.shortLabel}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3.5 align-top text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(vm)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => openDeleteModal(vm)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete / Out-of-Service Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  {Number(deleteTarget.sales_count || 0) > 0
                    ? "Cannot Delete Machine With Collection History"
                    : "Delete Vending Machine?"}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{deleteTarget.name}</span> (
                  <span className="font-mono">{deleteTarget.code}</span>)
                </p>
              </div>
            </div>

            {Number(deleteTarget.sales_count || 0) > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 leading-relaxed">
                This machine has{" "}
                <span className="font-semibold">
                  {deleteTarget.sales_count} recorded collection entry(ies)
                </span>
                . Deleting it is blocked so past vending sales records remain intact. Mark it{" "}
                <span className="font-semibold">Out of Service</span> instead to remove it from
                active collections, restocking, and public listings.
              </div>
            ) : (
              <p className="text-xs text-slate-600 leading-relaxed">
                This vending machine has no recorded sales history and will be permanently removed
                from the system.
              </p>
            )}

            {deleteError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              {Number(deleteTarget.sales_count || 0) > 0 ? (
                <button
                  type="button"
                  onClick={markOutOfServiceFromModal}
                  disabled={deleting || deleteTarget.status === "out_of_service"}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {deleteTarget.status === "out_of_service"
                    ? "Already Out of Service"
                    : deleting
                      ? "Updating..."
                      : "Mark Out of Service Instead"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Confirm Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { VendingMachinesManagement };
