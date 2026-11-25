import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Droplets, Lock, MapPin, Truck } from "lucide-react";
import { apiFetch, setToken } from "../lib/api";
const LoginView = ({
  onLoginSuccess,
  onOpenDeliveryPortal,
  onBackToLanding
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [lockSeconds, setLockSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (lockSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockSeconds((prev) => prev <= 1 ? 0 : prev - 1);
    }, 1e3);
    return () => clearInterval(timer);
  }, [lockSeconds]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockSeconds > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      setToken(res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      const eObj = err;
      setError(eObj.message || "Login failed");
      if (eObj.status === 429 && eObj.data?.remainingSeconds) {
        setLockSeconds(Number(eObj.data.remainingSeconds));
      }
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {
    /* Left Station Showcase Panel */
  }
      <div className="relative lg:w-1/2 bg-slate-900 text-white flex flex-col justify-between p-8 lg:p-12 overflow-hidden">
        <img
    src="/src/assets/images/aqua_fabz_station_1794795313061.jpg"
    alt="Aqua Fabz Water Refilling Station filtration and containers"
    referrerPolicy="no-referrer"
    className="absolute inset-0 h-full w-full object-cover opacity-35"
    onError={(e) => {
      e.currentTarget.style.display = "none";
    }}
  />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/75 to-slate-900/60" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600 text-white">
            <Droplets className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            Aqua Fabz Water Refilling Station
          </span>
        </div>

        <div className="relative z-10 my-12 max-w-lg space-y-5">
          <h1 className="font-display text-3xl lg:text-4xl font-bold leading-tight text-balance">
            Station Sales, Inventory, Customer & Location Mapping System
          </h1>
          <p className="text-sm lg:text-base text-slate-200 leading-relaxed">
            Centralized operations platform for station counter sales, vending machine
            collections, container tracking, customer orders, payments, and delivery
            location mapping across Binalbagan, Negros Occidental.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300 pt-2">
            <span>Purified & Mineral Refills</span>
            <span aria-hidden="true">·</span>
            <span>Vending Machine Consolidation</span>
            <span aria-hidden="true">·</span>
            <span>Delivery Map Reference</span>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-sky-400" />
            <span>Rizal St., Brgy. Poblacion, Binalbagan</span>
          </div>
          <span className="font-mono">0917-555-0148</span>
        </div>
      </div>

      {
    /* Right Login Panel */
  }
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Station Overview
            </button>
          )}
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Sign in to System</h2>
            <p className="mt-1.5 text-sm text-slate-600">
              Authorized Administrator and Staff accounts only. Accounts are provisioned by
              the Station Administrator.
            </p>
          </div>

          {error && <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {lockSeconds > 0 ? <Lock className="h-4 w-4 shrink-0 text-red-600 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />}
              <div>
                <p>{error}</p>
                {lockSeconds > 0 && <p className="mt-1 font-mono text-xs font-semibold">
                    Retry available in {lockSeconds}s
                  </p>}
              </div>
            </div>}

          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <input
    id="login-username"
    type="text"
    autoComplete="username"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    placeholder="Enter your username"
    required
    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
  />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
    id="login-password"
    type="password"
    autoComplete="current-password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="Enter your password"
    required
    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
  />
            </div>

            <button
    type="submit"
    disabled={loading || lockSeconds > 0}
    className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
  >
              {lockSeconds > 0 ? `Locked (${lockSeconds}s)` : loading ? "Signing in..." : "Log In"}
            </button>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">
                Demo Account Quick Fill
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <button
    type="button"
    onClick={() => {
      setUsername("admin");
      setPassword("admin123");
      setError("");
    }}
    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100 transition-colors"
  >
                  <div className="font-semibold text-slate-900">Administrator</div>
                  <div className="font-mono text-[11px] text-slate-500">admin / admin123</div>
                </button>
                <button
    type="button"
    onClick={() => {
      setUsername("staff");
      setPassword("staff123");
      setError("");
    }}
    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs hover:bg-slate-100 transition-colors"
  >
                  <div className="font-semibold text-slate-900">Staff</div>
                  <div className="font-mono text-[11px] text-slate-500">staff / staff123</div>
                </button>
              </div>
            </div>
          </form>

          {
    /* Delivery Personnel No-Login Reference Access (UC24 Business Rule) */
  }
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Delivery Personnel Reference
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Delivery personnel do not log in. Open the schedule, delivery statuses, and
                  customer map reference sheet prepared by Staff.
                </p>
              </div>
              <Truck className="h-5 w-5 shrink-0 text-sky-600" />
            </div>
            <button
    type="button"
    onClick={onOpenDeliveryPortal}
    className="mt-3.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
  >
              Open Delivery Schedule & Map Reference
            </button>
          </div>
        </div>
      </div>
    </div>;
};
export {
  LoginView
};
