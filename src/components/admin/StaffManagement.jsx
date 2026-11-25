import { useEffect, useState } from "react";
import { Edit2, Plus, UserCheck, UserX } from "lucide-react";
import { apiFetch, formatDateTime } from "../../lib/api";
const StaffManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/staff");
      setAccounts(res.accounts);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadAccounts();
  }, []);
  const openAdd = () => {
    setEditing(null);
    setName("");
    setUsername("");
    setPassword("");
    setContactNumber("");
    setError("");
    setShowForm(true);
  };
  const openEdit = (acc) => {
    setEditing(acc);
    setName(acc.name);
    setUsername(acc.username);
    setPassword("");
    setContactNumber(acc.contact_number || "");
    setError("");
    setShowForm(true);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (editing) {
        await apiFetch(`/api/staff/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name,
            contact_number: contactNumber,
            ...password ? { password } : {}
          })
        });
        setSuccess(`Updated Staff account "${editing.username}".`);
      } else {
        await apiFetch("/api/staff", {
          method: "POST",
          body: JSON.stringify({
            name,
            username,
            password,
            contact_number: contactNumber
          })
        });
        setSuccess(`Created Staff account "${username}".`);
      }
      setShowForm(false);
      loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save staff account.");
    }
  };
  const toggleStatus = async (acc) => {
    const nextStatus = acc.status === "active" ? "inactive" : "active";
    await apiFetch(`/api/staff/${acc.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus })
    });
    setSuccess(
      nextStatus === "inactive" ? `Deactivated "${acc.username}". Past records are preserved.` : `Reactivated "${acc.username}".`
    );
    loadAccounts();
  };
  return <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Staff Account Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, update, and deactivate Staff accounts. Deactivated staff cannot log in, while all historical transactions remain intact.
          </p>
        </div>
        <button
    type="button"
    onClick={openAdd}
    className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-sky-700"
  >
          <Plus className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {success}
        </div>}

      {showForm && <form
    onSubmit={handleSubmit}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {editing ? `Update Staff Account \u2014 ${editing.username}` : "Create Staff Account"}
            </h2>
            <button
    type="button"
    onClick={() => setShowForm(false)}
    className="text-xs text-slate-500 hover:text-slate-800"
  >
              Cancel
            </button>
          </div>

          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {error}
            </div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
    type="text"
    required
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
    placeholder="e.g. Juan Dela Cruz"
  />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username
              </label>
              <input
    type="text"
    required
    disabled={Boolean(editing)}
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 disabled:bg-slate-100"
    placeholder="unique_username"
  />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editing ? "New Password (optional)" : "Temporary Password"}
              </label>
              <input
    type="password"
    required={!editing}
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
    placeholder="Minimum 6 characters"
  />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Number
              </label>
              <input
    type="text"
    value={contactNumber}
    onChange={(e) => setContactNumber(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
    placeholder="0917-000-0000"
  />
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
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
              {editing ? "Save Account Changes" : "Create Staff Account"}
            </button>
          </div>
        </form>}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading accounts...</div> : <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Full Name</th>
                  <th className="px-5 py-3 font-semibold">Username</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => <tr key={acc.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{acc.name}</td>
                    <td className="px-5 py-3 font-mono text-slate-700">{acc.username}</td>
                    <td className="px-5 py-3 text-slate-600">{acc.role}</td>
                    <td className="px-5 py-3 font-mono text-slate-600">
                      {acc.contact_number || "\u2014"}
                    </td>
                    <td className="px-5 py-3">
                      <span
    className={`font-semibold ${acc.status === "active" ? "text-emerald-700" : "text-red-700"}`}
  >
                        {acc.status === "active" ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-500 tabular-nums">
                      {formatDateTime(acc.created_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {acc.role === "Staff" ? <div className="inline-flex items-center gap-2">
                          <button
    type="button"
    onClick={() => openEdit(acc)}
    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
  >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                          <button
    type="button"
    onClick={() => toggleStatus(acc)}
    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${acc.status === "active" ? "border-red-200 text-red-700 hover:bg-red-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
  >
                            {acc.status === "active" ? <>
                                <UserX className="h-3 w-3" /> Deactivate
                              </> : <>
                                <UserCheck className="h-3 w-3" /> Reactivate
                              </>}
                          </button>
                        </div> : <span className="text-slate-400">Primary Admin</span>}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>}
      </div>
    </div>;
};
export {
  StaffManagement
};
