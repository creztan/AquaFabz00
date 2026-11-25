import { useState } from "react";
import { apiFetch } from "../lib/api";
const AccountSettingsView = ({
  user,
  onUserUpdated
}) => {
  const [name, setName] = useState(user.name);
  const [contactNumber, setContactNumber] = useState(user.contact_number || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg("");
    setProfileErr("");
    try {
      const res = await apiFetch("/api/account/profile", {
        method: "PUT",
        body: JSON.stringify({ name, contact_number: contactNumber })
      });
      onUserUpdated(res.user);
      setProfileMsg("Account information updated.");
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Could not update profile.");
    }
  };
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg("");
    setPwdErr("");
    if (newPassword !== confirmPassword) {
      setPwdErr("New password and confirmation do not match.");
      return;
    }
    try {
      await apiFetch("/api/account/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });
      setPwdMsg("Password changed and recorded in the activity log.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwdErr(err instanceof Error ? err.message : "Unable to change password.");
    }
  };
  return <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          My Account Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Update your own profile information and password. Role assignments cannot be changed here.
        </p>
      </div>

      <form
    onSubmit={handleSaveProfile}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
        <h2 className="text-sm font-semibold text-slate-900">Account Information</h2>

        {profileMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
            {profileMsg}
          </div>}
        {profileErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {profileErr}
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
  />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username
            </label>
            <input
    type="text"
    disabled
    value={user.username}
    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-500"
  />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Role
            </label>
            <input
    type="text"
    disabled
    value={user.role}
    className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500"
  />
          </div>
        </div>

        <div className="flex justify-end">
          <button
    type="submit"
    className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
  >
            Save Account Changes
          </button>
        </div>
      </form>

      <form
    onSubmit={handleChangePassword}
    className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
  >
        <h2 className="text-sm font-semibold text-slate-900">Change Password</h2>

        {pwdMsg && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
            {pwdMsg}
          </div>}
        {pwdErr && <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
            {pwdErr}
          </div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Current Password
            </label>
            <input
    type="password"
    required
    value={currentPassword}
    onChange={(e) => setCurrentPassword(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Password
            </label>
            <input
    type="password"
    required
    value={newPassword}
    onChange={(e) => setNewPassword(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <input
    type="password"
    required
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900"
  />
          </div>
        </div>

        <div className="flex justify-end">
          <button
    type="submit"
    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
  >
            Update Password
          </button>
        </div>
      </form>
    </div>;
};
export {
  AccountSettingsView
};
