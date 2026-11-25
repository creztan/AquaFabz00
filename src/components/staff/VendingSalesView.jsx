import { useEffect, useState } from "react";
import { AlertTriangle, Ban, Edit3 } from "lucide-react";
import { apiFetch, formatCurrency, formatDate } from "../../lib/api";
const VendingSalesView = () => {
  const [machines, setMachines] = useState([]);
  const [vendingSales, setVendingSales] = useState([]);
  const [machineId, setMachineId] = useState("");
  const [saleDate, setSaleDate] = useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [success, setSuccess] = useState("");
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [correctTarget, setCorrectTarget] = useState(null);
  const [correctReason, setCorrectReason] = useState("");
  const [correctMachineId, setCorrectMachineId] = useState("");
  const [correctDate, setCorrectDate] = useState("");
  const [correctAmount, setCorrectAmount] = useState("");
  const [correctNotes, setCorrectNotes] = useState("");
  const [correctErr, setCorrectErr] = useState("");
  const load = async () => {
    const res = await apiFetch(
      "/api/vending-sales"
    );
    const nextMachines = Array.isArray(res.machines) ? res.machines : [];
    const nextSales = Array.isArray(res.vendingSales) ? res.vendingSales : [];
    setMachines(nextMachines);
    if (nextMachines.length > 0 && !machineId) {
      setMachineId(String(nextMachines[0].id));
    }
    setVendingSales(nextSales);
  };
  useEffect(() => {
    load();
  }, []);
  const submitSale = async (allowDuplicate = false) => {
    setError("");
    setDuplicateWarning("");
    setSuccess("");
    const numAmount = Number(amount);
    if (Number.isNaN(numAmount) || numAmount < 0) {
      setError("Amount collected must be a valid non-negative number.");
      return;
    }
    try {
      await apiFetch("/api/vending-sales", {
        method: "POST",
        body: JSON.stringify({
          machine_id: String(machineId),
          sale_date: saleDate,
          amount: numAmount,
          notes,
          allowDuplicate
        })
      });
      setAmount("");
      setNotes("");
      setSuccess("Vending machine sales recorded and added to daily & overall totals.");
      load();
    } catch (err) {
      const eObj = err;
      if (eObj.status === 409 && eObj.data?.duplicate) {
        setDuplicateWarning(eObj.message);
      } else {
        setError(eObj.message || "Unable to record vending machine sale.");
      }
    }
  };
  const handleVoid = async (e) => {
    e.preventDefault();
    if (!voidTarget) return;
    await apiFetch(`/api/vending-sales/${voidTarget.id}/void`, {
      method: "POST",
      body: JSON.stringify({ reason: voidReason })
    });
    setVoidTarget(null);
    setVoidReason("");
    setSuccess("Voided vending machine sale entry and recorded in activity log.");
    load();
  };
  const openCorrectModal = (vs) => {
    setCorrectTarget(vs);
    setCorrectMachineId(String(vs.machine_id));
    setCorrectDate(vs.sale_date);
    setCorrectAmount(String(vs.amount));
    setCorrectNotes(vs.notes || "");
    setCorrectReason("");
    setCorrectErr("");
  };
  const handleCorrectVendingSale = async (e) => {
    e.preventDefault();
    if (!correctTarget) return;
    setCorrectErr("");
    const numAmount = Number(correctAmount);
    if (Number.isNaN(numAmount) || numAmount < 0) {
      setCorrectErr("Amount collected must be a valid non-negative number.");
      return;
    }
    try {
      await apiFetch(`/api/vending-sales/${correctTarget.id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: `Correction: ${correctReason}` })
      });
      await apiFetch("/api/vending-sales", {
        method: "POST",
        body: JSON.stringify({
          machine_id: String(correctMachineId),
          sale_date: correctDate,
          amount: numAmount,
          notes: correctNotes,
          allowDuplicate: true
        })
      });
      setCorrectTarget(null);
      setCorrectReason("");
      setSuccess("Corrected vending machine sale entry and updated daily & overall totals.");
      load();
    } catch (err) {
      setCorrectErr(err instanceof Error ? err.message : "Unable to save corrected entry.");
    }
  };
  return <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Vending Machine Sales Recording
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Record coin/cash collections from each Aqua Fabz vending machine. Collections are automatically included in daily and overall sales totals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
    onSubmit={(e) => {
      e.preventDefault();
      submitSale(false);
    }}
    className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 space-y-4"
  >
          <h2 className="text-sm font-semibold text-slate-900">Log Machine Collection</h2>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>}
          {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
              {success}
            </div>}
          {duplicateWarning && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{duplicateWarning}</span>
              </div>
              <div className="flex gap-2">
                <button
    type="button"
    onClick={() => submitSale(true)}
    className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
  >
                  Save Additional Entry
                </button>
                <button
    type="button"
    onClick={() => setDuplicateWarning("")}
    className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-900"
  >
                  Cancel
                </button>
              </div>
            </div>}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vending Machine
            </label>
            <select
    value={machineId}
    onChange={(e) => setMachineId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
              {machines.map((m) => <option key={m.id} value={m.id}>
                  {m.name} (Stock: {m.stock_qty} gal){m.status === "maintenance" ? " — On Maintenance" : ""}
                </option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Collection Date
            </label>
            <input
    type="date"
    required
    value={saleDate}
    onChange={(e) => setSaleDate(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Amount Collected (₱)
            </label>
            <input
    type="number"
    step="0.01"
    min="0"
    required
    value={amount}
    onChange={(e) => setAmount(e.target.value)}
    placeholder="0.00"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <input
    type="text"
    value={notes}
    onChange={(e) => setNotes(e.target.value)}
    placeholder="e.g. Afternoon coin box collection"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
          </div>

          <button
    type="submit"
    className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
  >
            Save Vending Machine Sale
          </button>
        </form>

        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">
              Recorded Vending Machine Collections ({vendingSales.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Machine</th>
                  <th className="px-4 py-3 font-semibold">Collection Date</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendingSales.map((vs) => <tr
    key={vs.id}
    className={vs.status === "voided" ? "bg-red-50/40 text-slate-400" : "hover:bg-slate-50"}
  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>{vs.machine_name}</div>
                      <div className="text-[11px] text-slate-500">{vs.location_name}</div>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums">{formatDate(vs.sale_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{vs.notes || "\u2014"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(vs.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
    className={`font-semibold ${vs.status === "completed" ? "text-emerald-700" : "text-red-700"}`}
  >
                        {vs.status === "completed" ? "Recorded" : "Voided"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {vs.status === "completed" && <div className="inline-flex items-center gap-1.5">
                          <button
    type="button"
    onClick={() => openCorrectModal(vs)}
    className="inline-flex items-center gap-1 rounded-md border border-amber-200 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
  >
                            <Edit3 className="h-3 w-3" /> Correct
                          </button>
                          <button
    type="button"
    onClick={() => {
      setVoidTarget(vs);
      setVoidReason("");
    }}
    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-700 hover:bg-red-50"
  >
                            <Ban className="h-3 w-3" /> Void
                          </button>
                        </div>}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {voidTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleVoid}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Void Vending Machine Entry
            </h3>
            <p className="text-xs text-slate-600">
              {voidTarget.machine_name} · {formatDate(voidTarget.sale_date)} ·{" "}
              {formatCurrency(voidTarget.amount)}
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Voiding
              </label>
              <input
    type="text"
    required
    value={voidReason}
    onChange={(e) => setVoidReason(e.target.value)}
    placeholder="e.g. Incorrect coin count entered"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setVoidTarget(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
  >
                Cancel
              </button>
              <button
    type="submit"
    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
  >
                Confirm Void
              </button>
            </div>
          </form>
        </div>}
      {correctTarget && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <form
    onSubmit={handleCorrectVendingSale}
    className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 space-y-4 shadow-xl"
  >
            <h3 className="text-sm font-semibold text-slate-900">
              Correct Vending Machine Entry
            </h3>
            <p className="text-xs text-slate-600">
              Replaces the previous entry ({correctTarget.machine_name} · {formatDate(correctTarget.sale_date)} · {formatCurrency(correctTarget.amount)}) and records the correction in the activity log.
            </p>
            {correctErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {correctErr}
              </div>}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vending Machine
              </label>
              <select
    value={correctMachineId}
    onChange={(e) => setCorrectMachineId(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
                {machines.map((m) => <option key={m.id} value={m.id}>
                    {m.name}{m.status === "maintenance" ? " — On Maintenance" : ""}
                  </option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Collection Date
                </label>
                <input
    type="date"
    required
    value={correctDate}
    onChange={(e) => setCorrectDate(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected Amount (₱)
                </label>
                <input
    type="number"
    step="0.01"
    min="0"
    required
    value={correctAmount}
    onChange={(e) => setCorrectAmount(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <input
    type="text"
    value={correctNotes}
    onChange={(e) => setCorrectNotes(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Correction (Required)
              </label>
              <input
    type="text"
    required
    value={correctReason}
    onChange={(e) => setCorrectReason(e.target.value)}
    placeholder="e.g. Recounted coin box total"
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
            </div>
            <div className="flex justify-end gap-2">
              <button
    type="button"
    onClick={() => setCorrectTarget(null)}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700"
  >
                Cancel
              </button>
              <button
    type="submit"
    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
  >
                Save Correction
              </button>
            </div>
          </form>
        </div>}
    </div>;
};
export {
  VendingSalesView
};
