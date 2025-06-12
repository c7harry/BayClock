import React, { useState } from "react";
import { supabase } from "../supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Password updated! You can now log in with your new password.");
    }
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleSubmit} style={{ background: "#fff", padding: 32, borderRadius: 8, boxShadow: "0 2px 16px rgba(0,0,0,0.2)", minWidth: 320 }}>
        <h2>Reset Password</h2>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 8, margin: "16px 0", borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button type="submit" disabled={submitting} style={{ width: "100%", padding: 10, background: "#fb923c", color: "#fff", border: "none", borderRadius: 4, fontWeight: 600 }}>
          {submitting ? "Updating..." : "Update Password"}
        </button>
        {message && <div style={{ marginTop: 16, color: "#b45309", fontWeight: 600 }}>{message}</div>}
      </form>
    </div>
  );
}