import { useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { apiFetch, exportRowsToCsv, formatCurrency } from "../../lib/api";
const REPORT_TYPES = [
  { id: "sales", label: "Sales Report" },
  { id: "inventory", label: "Inventory Report" },
  { id: "customers", label: "Customers Report" },
  { id: "products", label: "Products & Pricing Report" },
  { id: "payments", label: "Payments Report" },
  { id: "orders", label: "Orders Report" },
  { id: "containers", label: "Containers Report" },
  { id: "deliveries", label: "Deliveries Report" },
  { id: "vending", label: "Vending Machine Sales Report" },
  { id: "locations", label: "Customer Locations Report" },
  { id: "compliance", label: "Water Quality & Compliance Logs" }
];
const ReportsView = () => {
  const [reportType, setReportType] = useState("sales");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generateReport = async (e) => {
    e.preventDefault();
    setError("");
    if (startDate && endDate && endDate < startDate) {
      setError("Invalid date range: end date cannot be earlier than start date.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);
      const res = await apiFetch(
        `/api/admin/reports?${params.toString()}`
      );
      setRows(res.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate report.");
    } finally {
      setLoading(false);
    }
  };
  const columns = rows && rows.length > 0 ? Object.keys(rows[0]) : [];
  const selectedLabel = REPORT_TYPES.find((r) => r.id === reportType)?.label || "Generated Report";
  const formatCell = (col, val) => {
    if (typeof val === "number" && /amount|total|price|paid|collected/i.test(col)) {
      return formatCurrency(val);
    }
    return String(val ?? "\u2014");
  };
  return <div className="space-y-6">
      <div className="no-print">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Generate Reports
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Generate view-only reports across all 10 operational categories from recorded transactions, then print or export to CSV.
        </p>
      </div>

      <form
    onSubmit={generateReport}
    className="no-print rounded-xl border border-slate-200 bg-white p-5 space-y-4"
  >
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {error}
          </div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Report Type
            </label>
            <select
    value={reportType}
    onChange={(e) => setReportType(e.target.value)}
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
              {REPORT_TYPES.map((rt) => <option key={rt.id} value={rt.id}>
                  {rt.label}
                </option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Start Date (Optional)
            </label>
            <input
    type="date"
    value={startDate}
    onChange={(e) => setStartDate(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              End Date (Optional)
            </label>
            <input
    type="date"
    value={endDate}
    onChange={(e) => setEndDate(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
          </div>

          <button
    type="submit"
    disabled={loading}
    className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
            <FileSpreadsheet className="h-4 w-4" />
            {loading ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </form>

      {rows !== null && <div className="print-area rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Aqua Fabz Water Refilling Station — {selectedLabel}
              </h2>
              <p className="text-xs text-slate-500">
                {startDate || endDate ? `Period: ${startDate || "Beginning"} to ${endDate || "Present"}` : "All recorded entries"}{" "}
                · {rows.length} record{rows.length === 1 ? "" : "s"}
              </p>
            </div>

            {rows.length > 0 && <div className="no-print flex items-center gap-2">
                <button
    type="button"
    onClick={() => exportRowsToCsv(`aqua-fabz-${reportType}-report.csv`, rows)}
    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
  >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>
                <button
    type="button"
    onClick={() => window.print()}
    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
  >
                  <Printer className="h-3.5 w-3.5" />
                  Print Report
                </button>
              </div>}
          </div>

          {rows.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">
              No records were found matching this report type and date range.
            </div> : <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    {columns.map((col) => <th key={col} className="px-4 py-3 font-semibold whitespace-nowrap">
                        {col}
                      </th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, idx) => <tr key={idx} className="hover:bg-slate-50">
                      {columns.map((col) => <td
    key={col}
    className={`px-4 py-2.5 ${typeof row[col] === "number" ? "font-mono tabular-nums text-slate-900" : "text-slate-700"}`}
  >
                          {formatCell(col, row[col])}
                        </td>)}
                    </tr>)}
                </tbody>
              </table>
            </div>}
        </div>}
    </div>;
};
export {
  ReportsView
};
