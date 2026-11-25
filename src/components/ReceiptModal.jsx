import { Printer, X } from "lucide-react";
import { formatCurrency, formatDateTime } from "../lib/api";
const ReceiptModal = ({ receipt, onClose }) => {
  if (!receipt) return null;
  const titleMap = {
    sale: "Official Sales Receipt",
    order: "Customer Order Slip",
    payment: "Payment Acknowledgement Receipt"
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-slate-900">
            Print Preview — {titleMap[receipt.kind]}
          </h3>
          <button
    type="button"
    onClick={onClose}
    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    aria-label="Close print preview"
  >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="print-area p-6 text-slate-900">
          {receipt.isReprint && <div className="mb-4 border border-amber-400 bg-amber-50 px-3 py-1.5 text-center text-xs font-bold tracking-wider text-amber-900">
              REPRINT — COPY (PRINT #{receipt.printCount})
            </div>}

          <div className="border-b border-dashed border-slate-300 pb-4 text-center">
            <h2 className="text-base font-bold tracking-tight text-slate-900">
              AQUA FABZ WATER REFILLING STATION
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Rizal St., Brgy. Poblacion, Binalbagan, Negros Occidental
            </p>
            <p className="text-xs text-slate-600">Contact: 0917-555-0148</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-800">
              {titleMap[receipt.kind]}
            </p>
          </div>

          <div className="space-y-1.5 border-b border-dashed border-slate-300 py-3.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Reference No.</span>
              <span className="font-mono font-semibold">{receipt.referenceNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time</span>
              <span className="font-mono tabular-nums">{formatDateTime(receipt.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer</span>
              <span className="font-medium text-right">{receipt.customerName}</span>
            </div>
            {receipt.customerContact && <div className="flex justify-between">
                <span className="text-slate-500">Contact</span>
                <span className="font-mono">{receipt.customerContact}</span>
              </div>}
            {receipt.orderType && <div className="flex justify-between">
                <span className="text-slate-500">Order Type</span>
                <span className="font-medium">{receipt.orderType}</span>
              </div>}
            {receipt.deliveryAddress && <div className="flex justify-between gap-4">
                <span className="text-slate-500 shrink-0">Delivery To</span>
                <span className="text-right">{receipt.deliveryAddress}</span>
              </div>}
            {receipt.paymentMethod && <div className="flex justify-between">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-medium">{receipt.paymentMethod}</span>
              </div>}
            {receipt.paymentStatus && <div className="flex justify-between">
                <span className="text-slate-500">Payment Status</span>
                <span className="font-semibold">{receipt.paymentStatus}</span>
              </div>}
          </div>

          {receipt.items && receipt.items.length > 0 && <div className="border-b border-dashed border-slate-300 py-3.5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="pb-1.5 font-medium">Item</th>
                    <th className="pb-1.5 text-right font-medium">Qty</th>
                    <th className="pb-1.5 text-right font-medium">Price</th>
                    <th className="pb-1.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipt.items.map((item, idx) => <tr key={idx}>
                      <td className="py-1.5 pr-2">{item.product_name}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono tabular-nums">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-1.5 text-right font-mono font-medium tabular-nums">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>}

          <div className="space-y-1.5 pt-3.5 text-xs">
            <div className="flex justify-between text-sm font-bold text-slate-900">
              <span>{receipt.kind === "payment" ? "Amount Paid" : "Total Amount"}</span>
              <span className="font-mono tabular-nums">{formatCurrency(receipt.totalAmount)}</span>
            </div>
            {receipt.amountPaid !== void 0 && receipt.kind === "order" && <>
                <div className="flex justify-between text-slate-600">
                  <span>Amount Paid</span>
                  <span className="font-mono tabular-nums">{formatCurrency(receipt.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-800">
                  <span>Remaining Balance</span>
                  <span className="font-mono tabular-nums">
                    {formatCurrency(Math.max(0, receipt.totalAmount - receipt.amountPaid))}
                  </span>
                </div>
              </>}
            {receipt.notes && <p className="pt-2 text-[11px] text-slate-500">Notes: {receipt.notes}</p>}
          </div>

          <div className="mt-5 border-t border-dashed border-slate-300 pt-3 text-center text-[11px] text-slate-500">
            Thank you for choosing Aqua Fabz Water Refilling Station.
          </div>
        </div>

        <div className="no-print flex items-center justify-end gap-2.5 border-t border-slate-200 px-5 py-3.5">
          <button
    type="button"
    onClick={onClose}
    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
  >
            Close
          </button>
          <button
    type="button"
    onClick={() => window.print()}
    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-700"
  >
            <Printer className="h-4 w-4" />
            Print Record
          </button>
        </div>
      </div>
    </div>;
};
export {
  ReceiptModal
};
