import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { apiFetch, formatDateTime } from "../../lib/api";
const ActivityLogsView = () => {
  const [logs, setLogs] = useState([]);
  const [usernames, setUsernames] = useState([]);
  const [actions, setActions] = useState([]);
  const [usernameFilter, setUsernameFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (usernameFilter !== "All") params.set("username", usernameFilter);
        if (actionFilter !== "All") params.set("action", actionFilter);
        if (dateFilter) params.set("date", dateFilter);
        const res = await apiFetch(`/api/admin/activity-logs?${params.toString()}`);
        setLogs(Array.isArray(res.logs) ? res.logs : []);
        setUsernames(Array.isArray(res.usernames) ? res.usernames : []);
        setActions(Array.isArray(res.actions) ? res.actions : []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [usernameFilter, actionFilter, dateFilter]);
  return <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          System Activity Logs
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Immutable audit trail of logins, account updates, price changes, voids, cancellations, and stock adjustments. Entries cannot be edited or deleted.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Filter by User
          </label>
          <select
    value={usernameFilter}
    onChange={(e) => setUsernameFilter(e.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
            <option value="All">All Users</option>
            {usernames.map((u) => <option key={u} value={u}>
                {u}
              </option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Action Type
          </label>
          <select
    value={actionFilter}
    onChange={(e) => setActionFilter(e.target.value)}
    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
  >
            <option value="All">All Actions</option>
            {actions.map((a) => <option key={a} value={a}>
                {a}
              </option>)}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Date
          </label>
          <input
    type="date"
    value={dateFilter}
    onChange={(e) => setDateFilter(e.target.value)}
    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
  />
        </div>

        {(usernameFilter !== "All" || actionFilter !== "All" || dateFilter) && <button
    type="button"
    onClick={() => {
      setUsernameFilter("All");
      setActionFilter("All");
      setDateFilter("");
    }}
    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
  >
            Reset Filters
          </button>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading activity logs...</div> : logs.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">
            No activity log entries match the selected filters. Try adjusting or resetting the filters.
          </div> : <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Date & Time</th>
                  <th className="px-5 py-3 font-semibold">User</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-slate-600 whitespace-nowrap tabular-nums">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-5 py-3 font-mono font-medium text-slate-900">
                      {log.username}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{log.user_role}</td>
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-800">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="h-3 w-3 text-slate-400" />
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{log.description}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </div>
    </div>;
};
export {
  ActivityLogsView
};
