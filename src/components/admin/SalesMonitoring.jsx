import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import { apiFetch, formatCurrency, formatDate, formatDateTime } from "../../lib/api";
const SalesMonitoring = () => {
  const [period, setPeriod] = useState("daily");
  const [source, setSource] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [selectedVending, setSelectedVending] = useState(null);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch(
          `/api/admin/sales-summary?period=${period}&source=${source}`
        );
        setData(res);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period, source]);
  const stationSales = data?.stationSales || [];
  const orderPayments = data?.orderPayments || [];
  const vendingSales = data?.vendingSales || [];
  const grandTotal = Number(data?.grandTotal || 0);
  const stationTotal = Number(data?.stationTotal || 0);
  const vendingTotal = Number(data?.vendingTotal || 0);

  const noRecords = Boolean(
    data &&
    stationSales.length === 0 &&
    orderPayments.length === 0 &&
    vendingSales.length === 0
  );
  return <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Daily Sales & Sales Summary
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor station sales and vending machine totals across daily, weekly, and monthly periods.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {["daily", "weekly", "monthly"].map((p) => <button
    key={p}
    type="button"
    onClick={() => setPeriod(p)}
    className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${period === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
  >
                {p}
              </button>)}
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            {[
    { id: "all", label: "All Sources" },
    { id: "station", label: "Station Only" },
    { id: "vending", label: "Vending Only" }
  ].map((s) => <button
    key={s.id}
    type="button"
    onClick={() => setSource(s.id)}
    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${source === s.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
  >
                {s.label}
              </button>)}
          </div>
        </div>
      </div>

      {loading || !data ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Computing sales summary...
        </div> : <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-medium text-slate-500">
                Combined Total ({period})
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-slate-900 tabular-nums">
                {formatCurrency(grandTotal)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-medium text-slate-500">
                Station Counter & Order Payments
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-sky-700 tabular-nums">
                {formatCurrency(stationTotal)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-medium text-slate-500">
                Vending Machine Sales
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-teal-700 tabular-nums">
                {formatCurrency(vendingTotal)}
              </div>
            </div>
          </div>

          {grandTotal > 0 && (() => {
    const stationPct = Math.round(stationTotal / grandTotal * 100);
    const vendingPct = 100 - stationPct;
    return <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-900">
                    Sales Breakdown by Source ({period})
                  </span>
                  <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-slate-600">
                    <span>
                      Station: <strong className="text-sky-700">{stationPct}%</strong> ({formatCurrency(stationTotal)})
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Vending: <strong className="text-teal-700">{vendingPct}%</strong> ({formatCurrency(vendingTotal)})
                    </span>
                  </div>
                </div>
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
      className="bg-sky-600 transition-all"
      style={{ width: `${stationPct}%` }}
    />
                  <div
      className="bg-teal-600 transition-all"
      style={{ width: `${vendingPct}%` }}
    />
                </div>
              </div>;
  })()}

          {noRecords ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No sales records were found for the selected {period} period and source filter.
            </div> : <div className="space-y-6">
              {source !== "vending" && <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="border-b border-slate-200 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Completed Station Sales ({stationSales.length})
                    </h2>
                  </div>
                  {stationSales.length === 0 ? <div className="p-5 text-xs text-slate-500">No counter sales in this period.</div> : <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Receipt #</th>
                            <th className="px-5 py-3 font-semibold">Customer</th>
                            <th className="px-5 py-3 font-semibold">Method</th>
                            <th className="px-5 py-3 font-semibold">Date</th>
                            <th className="px-5 py-3 text-right font-semibold">Total</th>
                            <th className="px-5 py-3 text-right font-semibold">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {stationSales.map((s) => <tr key={s.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-mono font-semibold text-slate-900">
                                {s.receipt_no}
                              </td>
                              <td className="px-5 py-3 text-slate-700">{s.customer_name}</td>
                              <td className="px-5 py-3 text-slate-600">{s.payment_method}</td>
                              <td className="px-5 py-3 font-mono text-slate-600 tabular-nums">
                                {formatDateTime(s.created_at)}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                                {formatCurrency(s.total_amount)}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <button
    type="button"
    onClick={() => setSelectedSale(s)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
  >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </button>
                              </td>
                            </tr>)}
                        </tbody>
                      </table>
                    </div>}
                </div>}

              {source !== "vending" && orderPayments.length > 0 && <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="border-b border-slate-200 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Order Payments Collected ({orderPayments.length})
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Payment #</th>
                          <th className="px-5 py-3 font-semibold">Order #</th>
                          <th className="px-5 py-3 font-semibold">Customer</th>
                          <th className="px-5 py-3 font-semibold">Method</th>
                          <th className="px-5 py-3 font-semibold">Date</th>
                          <th className="px-5 py-3 text-right font-semibold">Amount</th>
                          <th className="px-5 py-3 text-right font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderPayments.map((p) => <tr key={p.id} className="hover:bg-slate-50">
                            <td className="px-5 py-3 font-mono font-semibold">{p.payment_no}</td>
                            <td className="px-5 py-3 font-mono text-slate-700">{p.order_no}</td>
                            <td className="px-5 py-3 text-slate-700">{p.customer_name}</td>
                            <td className="px-5 py-3 text-slate-600">{p.method}</td>
                            <td className="px-5 py-3 font-mono text-slate-600 tabular-nums">
                              {formatDateTime(p.created_at)}
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                              {formatCurrency(p.amount)}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
    type="button"
    onClick={() => setSelectedPayment(p)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
  >
                                <Eye className="h-3.5 w-3.5" /> View
                              </button>
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>}

              {source !== "station" && <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="border-b border-slate-200 px-5 py-3.5">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Vending Machine Collections ({vendingSales.length})
                    </h2>
                  </div>
                  {vendingSales.length === 0 ? <div className="p-5 text-xs text-slate-500">No vending sales in this period.</div> : <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Vending Machine</th>
                            <th className="px-5 py-3 font-semibold">Location</th>
                            <th className="px-5 py-3 font-semibold">Collection Date</th>
                            <th className="px-5 py-3 font-semibold">Notes</th>
                            <th className="px-5 py-3 text-right font-semibold">Amount</th>
                            <th className="px-5 py-3 text-right font-semibold">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {vendingSales.map((vs) => <tr key={vs.id} className="hover:bg-slate-50">
                              <td className="px-5 py-3 font-medium text-slate-900">
                                {vs.machine_name}
                              </td>
                              <td className="px-5 py-3 text-slate-600">{vs.location_name}</td>
                              <td className="px-5 py-3 font-mono text-slate-600 tabular-nums">
                                {formatDate(vs.sale_date)}
                              </td>
                              <td className="px-5 py-3 text-slate-600">{vs.notes || "\u2014"}</td>
                              <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                                {formatCurrency(vs.amount)}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <button
    type="button"
    onClick={() => setSelectedVending(vs)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
  >
                                  <Eye className="h-3.5 w-3.5" /> View
                                </button>
                              </td>
                            </tr>)}
                        </tbody>
                      </table>
                    </div>}
                </div>}
            </div>}
        </>}

      {selectedSale && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900">
                Transaction Details — {selectedSale.receipt_no}
              </h3>
              <button
    type="button"
    onClick={() => setSelectedSale(null)}
    className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
  >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="block text-slate-400">Customer</span>
                  <span className="font-semibold text-slate-900">{selectedSale.customer_name}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Recorded By</span>
                  <span className="font-semibold text-slate-900">
                    {selectedSale.recorded_by_name}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Date & Time</span>
                  <span className="font-mono">{formatDateTime(selectedSale.created_at)}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Payment Method</span>
                  <span className="font-semibold text-slate-900">{selectedSale.payment_method}</span>
                </div>
              </div>
              <table className="w-full border-t border-slate-200 pt-3">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-2">Product</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Unit Price</th>
                    <th className="py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale.items?.map((item) => <tr key={item.id}>
                      <td className="py-2 text-slate-900">{item.product_name}</td>
                      <td className="py-2 text-right font-mono tabular-nums">{item.quantity}</td>
                      <td className="py-2 text-right font-mono tabular-nums">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2 text-right font-mono font-semibold tabular-nums">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>)}
                </tbody>
              </table>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-900">
                <span>Total Amount</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(selectedSale.total_amount)}
                </span>
              </div>
            </div>
          </div>
        </div>}
      {selectedPayment && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900">
                Payment Details — {selectedPayment.payment_no}
              </h3>
              <button
    type="button"
    onClick={() => setSelectedPayment(null)}
    className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
  >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="block text-slate-400">Order Reference</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {selectedPayment.order_no}
                    {selectedPayment.order_type ? ` (${selectedPayment.order_type})` : ""}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Customer</span>
                  <span className="font-semibold text-slate-900">{selectedPayment.customer_name}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Payment Method</span>
                  <span className="font-semibold text-slate-900">{selectedPayment.method}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Recorded By</span>
                  <span className="font-semibold text-slate-900">
                    {selectedPayment.recorded_by_name}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Date & Time</span>
                  <span className="font-mono">{formatDateTime(selectedPayment.created_at)}</span>
                </div>
                {selectedPayment.order_payment_status && <div>
                    <span className="block text-slate-400">Order Status</span>
                    <span className="font-semibold text-slate-900">
                      {selectedPayment.order_payment_status}
                    </span>
                  </div>}
              </div>
              {selectedPayment.reference_note && <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                  Note: {selectedPayment.reference_note}
                </div>}
              <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-900">
                <span>Payment Amount</span>
                <span className="font-mono tabular-nums text-emerald-700">
                  {formatCurrency(selectedPayment.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>}

      {selectedVending && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <h3 className="text-sm font-semibold text-slate-900">
                Vending Machine Collection — {selectedVending.machine_name}
              </h3>
              <button
    type="button"
    onClick={() => setSelectedVending(null)}
    className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
  >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 text-slate-600">
                <div>
                  <span className="block text-slate-400">Location</span>
                  <span className="font-semibold text-slate-900">
                    {selectedVending.location_name}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Collection Date</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatDate(selectedVending.sale_date)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Recorded By</span>
                  <span className="font-semibold text-slate-900">
                    {selectedVending.recorded_by_name}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Logged At</span>
                  <span className="font-mono">{formatDateTime(selectedVending.created_at)}</span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
                Notes: {selectedVending.notes || "None"}
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-bold text-slate-900">
                <span>Amount Collected</span>
                <span className="font-mono tabular-nums text-teal-700">
                  {formatCurrency(selectedVending.amount)}
                </span>
              </div>
            </div>
          </div>
        </div>}
    </div>;
};
export {
  SalesMonitoring
};
