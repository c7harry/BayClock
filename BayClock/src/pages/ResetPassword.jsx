import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import styled from "styled-components";

const backgroundUrl = "/Background.png";
const headerTextUrl = "/Header.png";

const TopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15,45,82,0.65);
  color: white;
  padding: 0.5rem 0 0.5rem 0;
  width: 100vw;
  min-height: 75px;
  box-shadow: 0 2px 16px rgba(15,45,82,0.12);
  z-index: 10;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(8px);
  img {
    height: 75px;
  }
`;

const GlassForm = styled.div`
  background: rgba(255,255,255,0.13);
  border-radius: 2rem;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1.5px solid rgba(255,255,255,0.18);
  padding: 2.5rem 2rem 2rem 2rem;
  max-width: 420px;
  width: 100%;
  margin: 3rem auto 2rem auto;
  color: #0F2D52;
  text-align: center;
  transition: box-shadow 0.3s;
`;

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
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
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundImage: `url(${backgroundUrl})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center center",
        fontFamily: "'Inter', sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Top Bar */}
      <TopBar>
        <img src={headerTextUrl} alt="Header Text" />
      </TopBar>

      {/* Glass Form */}
      <GlassForm>
        <h2 style={{ color: "#fb923c", fontWeight: 900, marginBottom: "1.5rem" }}>Reset Password</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 12,
              margin: "16px 0 8px 0",
              borderRadius: 8,
              border: "1.5px solid #ccc",
              fontSize: "1.1rem",
              background: "rgba(255,255,255,0.7)",
              color: "#0F2D52"
            }}
          />
          <input
            type="password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 12,
              margin: "8px 0 16px 0",
              borderRadius: 8,
              border: "1.5px solid #ccc",
              fontSize: "1.1rem",
              background: "rgba(255,255,255,0.7)",
              color: "#0F2D52"
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: 12,
              background: "linear-gradient(90deg, #fb923c 0%, #ffa94d 100%)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "1.1rem",
              boxShadow: "0 4px 24px 0 #ff691055",
              marginTop: 8,
              cursor: "pointer",
              transition: "background 0.2s"
            }}
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
          {message && (
            <div style={{ marginTop: 18, color: "#b45309", fontWeight: 600, fontSize: "1.05rem" }}>
              {message}
            </div>
          )}
        </form>
      </GlassForm>

      {/* Footer */}
      <footer style={{
        padding: "2rem 0",
        textAlign: "center",
        color: "#fff",
        background: "rgba(15, 45, 82, 0.95)",
        fontWeight: 500,
        letterSpacing: "0.04em",
        fontSize: "1.1rem",
        borderTop: "1px solid #fff2",
        marginTop: "2rem"
      }}>
        &copy; {new Date().getFullYear()} BayClock. All rights reserved.
      </footer>
    </div>
  );
}