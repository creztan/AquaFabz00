import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Droplets, MapPin, Phone, Truck } from "lucide-react";
import { apiFetch, formatCurrency } from "../lib/api";
import { LocationMap } from "./LocationMap";

const LandingPage = ({ onOpenLogin, onOpenDeliveryPortal }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [categoryTab, setCategoryTab] = useState("all");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch("/api/public/overview")
      .then((res) => {
        if (!active) return;
        setOverview(res);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err?.message || "Unable to load station details.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const station = overview?.station || {
    name: "Aqua Fabz Water Refilling Station",
    address: "Rizal St., Brgy. Poblacion, Binalbagan, Negros Occidental",
    contact: "0917-555-0148",
    lat: 10.1935,
    lng: 122.8586
  };

  const products = overview?.products || [];
  const vendingMachines = overview?.vendingMachines || [];
  const serviceAreas = overview?.serviceAreas || [];

  const filteredProducts = useMemo(() => {
    if (categoryTab === "refills") {
      return products.filter(
        (p) => p.category === "Purified Water" || p.category === "Mineral Water"
      );
    }
    if (categoryTab === "supplies") {
      return products.filter(
        (p) => p.category !== "Purified Water" && p.category !== "Mineral Water"
      );
    }
    return products;
  }, [products, categoryTab]);

  const mapPins = useMemo(() => {
    const pins = [
      {
        id: "station",
        label: station.name,
        sublabel: "Main Refilling Station",
        address: station.address,
        lat: station.lat,
        lng: station.lng,
        kind: "station"
      }
    ];
    vendingMachines.forEach((vm) => {
      pins.push({
        id: `vm-${vm.id}`,
        label: vm.name,
        sublabel: "Station-Owned Vending Machine",
        address: vm.location_name,
        lat: vm.lat,
        lng: vm.lng,
        kind: "vending"
      });
    });
    return pins;
  }, [station, vendingMachines]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8, 1 row, single-line controls */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Aqua Fabz
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => scrollToSection("products")}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Products & Rates
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("operations")}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("service-areas")}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Service Map
            </button>
            <button
              type="button"
              onClick={onOpenDeliveryPortal}
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Delivery Reference
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenLogin}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
            >
              Staff & Admin Login
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-7xl px-6 py-10 lg:py-14 space-y-16">
        {/* Section 1: Hero Proposition + Focal Visual */}
        <section className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6 py-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                <span>Binalbagan, Negros Occidental</span>
                <span aria-hidden="true">·</span>
                <span>Water Refilling Station</span>
              </div>

              <h1
                className="font-display font-bold tracking-tight text-slate-900 text-balance leading-[1.08]"
                style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
              >
                Clean Water Refilling & Station Operations, Centralized.
              </h1>

              <p className="max-w-xl text-base text-slate-600 leading-relaxed">
                Aqua Fabz Water Refilling Station manages counter sales, station-owned vending
                machine collections, container circulation, customer orders, and saved Binalbagan
                delivery locations from one organized web-based system.
              </p>

              <div className="flex flex-wrap items-center gap-5 pt-1">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 whitespace-nowrap shrink-0"
                >
                  Staff & Admin Login
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenDeliveryPortal}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-sky-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
                >
                  <Truck className="h-4 w-4 text-sky-600" />
                  Open Delivery Reference Sheet
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                {!imageError ? (
                  <img
                    src="/src/assets/images/aqua_fabz_station_1794795313061.jpg"
                    alt="Aqua Fabz Water Refilling Station filtration units and purified 5-gallon containers"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 p-8 text-center text-white">
                    <Droplets className="h-12 w-12 text-sky-400" />
                    <p className="mt-3 font-display text-lg font-semibold">
                      Aqua Fabz Water Refilling Station
                    </p>
                    <p className="mt-1 text-xs text-slate-300">{station.address}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="text-xs font-medium text-sky-200">
                    Aqua Fabz Water Refilling Station
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-100">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-sky-300" />
                      {station.address}
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                      <Phone className="h-3.5 w-3.5 text-sky-300" />
                      {station.contact}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Station Summary Strip below Hero Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-xl border border-slate-200 bg-white">
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Main Station</div>
              <div className="mt-1.5 text-sm font-semibold text-slate-900">
                {station.address}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {station.city && station.province ? `${station.city}, ${station.province}` : "Binalbagan, Negros Occidental"}
              </div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Active Products</div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {loading ? "—" : products.length}
              </div>
              <div className="mt-1 text-xs text-slate-500">Water refills, containers & seals</div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Vending Machines</div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {loading ? "—" : vendingMachines.length}
              </div>
              <div className="mt-1 text-xs text-slate-500">Consolidated into station totals</div>
            </div>
            <div className="p-5">
              <div className="text-xs font-medium text-slate-500">Mapped Delivery Areas</div>
              <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {loading ? "—" : serviceAreas.length}
              </div>
              <div className="mt-1 text-xs text-slate-500">Saved barangay delivery zones</div>
            </div>
          </div>
        </section>

        {/* Section 2: Products & Rates + Station Vending Machines */}
        <section id="products" className="scroll-mt-24 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                Products, Refill Rates & Vending Locations
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Current station catalog and prices maintained by the Administrator, alongside active vending kiosks.
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {[
                { id: "all", label: "All Products" },
                { id: "refills", label: "Water Refills" },
                { id: "supplies", label: "Containers & Supplies" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryTab(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    categoryTab === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {loadError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  Station Price List ({filteredProducts.length})
                </h3>
                <span className="text-xs text-slate-500">Live station rates</span>
              </div>
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Loading products and prices...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No products found in this category.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Product</th>
                        <th className="px-5 py-3 font-semibold">Category</th>
                        <th className="px-5 py-3 font-semibold">Unit</th>
                        <th className="px-5 py-3 text-right font-semibold">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 font-medium text-slate-900">{p.name}</td>
                          <td className="px-5 py-3 text-slate-600">{p.category}</td>
                          <td className="px-5 py-3 text-slate-600">{p.unit}</td>
                          <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                            {formatCurrency(p.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Station-Owned Vending Machines ({vendingMachines.length})
                </h3>
              </div>
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Loading vending locations...
                  </div>
                ) : vendingMachines.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No active vending machines registered.
                  </div>
                ) : (
                  vendingMachines.map((vm) => (
                    <div key={vm.id} className="p-5 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-sm text-slate-900">{vm.name}</div>
                        <span
                          className={`text-[11px] font-semibold whitespace-nowrap ${
                            vm.status === "maintenance" ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {vm.status === "maintenance" ? "On Maintenance" : "Operational"}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">{vm.location_name}</div>
                      <div className="text-xs font-mono text-slate-400 tabular-nums">
                        {Number(vm.lat).toFixed(4)}, {Number(vm.lng).toFixed(4)}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-5 py-3.5 text-xs text-slate-600">
                Collections from each machine are logged by Staff and added automatically to daily and overall station sales totals.
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Core System Capabilities (Editorial Numbered Bento) */}
        <section id="operations" className="scroll-mt-24 space-y-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Built Around Daily Water Station Workflows
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Every module aligns with Aqua Fabz station responsibilities across Administrator oversight, Staff transactions, and Delivery Personnel references.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                01. Station Counter & Vending Machine Sales
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Staff record walk-in or customer purchases using live product prices with automatic stock deduction and printable receipts, alongside vending machine collections consolidated into daily, weekly, and monthly Administrator summaries.
              </p>
            </div>

            <div className="md:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                02. Customer Profiles, Orders & Payments
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Maintain walk-in, regular, and reseller profiles with multiple delivery addresses, pickup or delivery schedules, full or partial payment tracking, and complete transaction history.
              </p>
            </div>

            <div className="md:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                03. Container & Inventory Control
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Track available, borrowed, partially returned, damaged, and customer-owned water containers alongside stock-in, stock-out, vending restocks, and low-stock minimum alerts.
              </p>
            </div>

            <div className="md:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-2.5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                04. Location Mapping & Delivery Reference
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Staff save and adjust customer delivery pins on an interactive map, Administrators monitor service areas with frequent deliveries, and Delivery Personnel review view-only schedules, statuses, and map references without needing a login account.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Service Map & Role Access */}
        <section id="service-areas" className="scroll-mt-24 space-y-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
              Binalbagan Station Coverage & System Access
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Main station origin, vending machine locations, and access options for authorized users and delivery personnel.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4">
              <LocationMap
                centerLat={station.lat}
                centerLng={station.lng}
                zoom={14}
                pins={mapPins}
                heightClass="h-[380px]"
              />
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between gap-5">
              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Mapped Service Barangays
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {serviceAreas.length > 0
                    ? serviceAreas.join(" · ")
                    : "Brgy. Poblacion · Binalbagan Service Areas"}
                </p>
                <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Map pins represent saved station, vending machine, and delivery destinations without live GPS tracking.
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Administrator & Staff Access
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    Active Administrator and Staff accounts created by the Station Administrator sign in to access role-based modules.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-700"
                >
                  Sign In to Management System
                </button>

                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      Delivery Personnel Reference
                    </h4>
                    <p className="mt-1 text-xs text-slate-600">
                      Delivery personnel do not log in; open the view-only schedule, statuses, and saved map reference prepared by Staff.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenDeliveryPortal}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100"
                  >
                    Open Delivery Schedule & Map Reference
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="mt-12 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 px-6 py-8 text-xs text-slate-600">
          <div className="space-y-1">
            <div className="font-display text-sm font-bold text-slate-900">
              {station.name}
            </div>
            <div>
              {station.address} <span aria-hidden="true">·</span>{" "}
              <span className="font-mono">{station.contact}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <button
              type="button"
              onClick={() => scrollToSection("products")}
              className="hover:text-slate-900 transition-colors"
            >
              Products & Rates
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("operations")}
              className="hover:text-slate-900 transition-colors"
            >
              Capabilities
            </button>
            <button
              type="button"
              onClick={onOpenDeliveryPortal}
              className="hover:text-slate-900 transition-colors"
            >
              Delivery Reference
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="font-semibold text-sky-700 hover:text-sky-800 transition-colors"
            >
              Staff & Admin Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { LandingPage };
