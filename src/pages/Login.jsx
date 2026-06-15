import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  Star,
  TrendingUp,
  Layers,
  Info,
} from "lucide-react";
import { Tooltip } from "../components/ui/Tooltip";

/* ─────────────────────────────────────────────
   PLATFORM PILL
───────────────────────────────────────────── */
const platforms = [
  { name: "Google", dot: "#4285F4" },
  { name: "Booking.com", dot: "#003580" },
  { name: "Agoda", dot: "#E31837" },
  { name: "Airbnb", dot: "#FF5A5F" },
];

const PlatformPill = ({ name, dot }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "4px 10px",
      background: "#ffffff",
      border: "1px solid #e4e4e7",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 500,
      color: "#52525b",
      whiteSpace: "nowrap",
      transition: "border-color 150ms ease, transform 150ms ease",
      cursor: "default",
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = "#f97316";
      e.currentTarget.style.transform = "scale(1.03)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = "#e4e4e7";
      e.currentTarget.style.transform = "scale(1)";
    }}
  >
    <span style={{
      width: 7, height: 7, borderRadius: "50%",
      background: dot, flexShrink: 0,
    }} />
    {name}
  </span>
);

/* ─────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <div
    className="sh-animate-fade-in"
    style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      padding: "14px 16px",
      background: "rgba(255,255,255,0.75)",
      border: "1px solid #e4e4e7",
      borderRadius: 14,
      backdropFilter: "blur(4px)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      transition: "border-color 200ms ease, transform 200ms ease, box-shadow 200ms ease",
      cursor: "default",
      animationDelay: delay,
    }}
    onMouseEnter={e => {
      e.currentTarget.style.borderColor = "#f97316";
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.boxShadow = "0 4px 16px rgba(249,115,22,0.10)";
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = "#e4e4e7";
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
    }}
  >
    <div style={{
      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
      background: "#fff0e6", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <Icon size={15} color="#f97316" />
    </div>
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#18181b", margin: 0, lineHeight: 1.4 }}>
        {title}
      </p>
      <p style={{ fontSize: 12, color: "#71717a", margin: "2px 0 0", lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  </div>
);

/* ─────────────────────────────────────────────
   LOGIN PAGE
───────────────────────────────────────────── */
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const emailRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  /* Autofocus email on mount */
  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate]);

  /* Shared input focus ring style */
  const inputStyle = (focused) => ({
    width: "100%",
    height: 48,
    padding: "0 16px 0 44px",
    fontFamily: "var(--font-family-sans)",
    fontSize: 14,
    background: focused ? "#ffffff" : "#f9f9fb",
    border: `1.5px solid ${focused ? "#f97316" : "#e4e4e7"}`,
    borderRadius: 10,
    color: "#18181b",
    outline: "none",
    boxShadow: focused ? "0 0 0 3px rgba(249,115,22,0.12)" : "none",
    transition: "all 150ms ease",
  });

  const iconStyle = { /* absolute, left-anchored */
    position: "absolute",
    left: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#a1a1aa",
    pointerEvents: "none",
  };

  return (
    <>
      {/* Page-level keyframes */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .sh-animate-fade-in {
          opacity: 0;
          animation: fadeUp 0.45s cubic-bezier(0,0,0.2,1) forwards;
        }
        .login-card-enter {
          animation: fadeIn 0.35s ease forwards;
        }
        /* keep existing sh-grid-background from utilities.css */
      `}</style>

      <div
        className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 sh-grid-background font-sans text-zinc-900"
        style={{ fontFamily: "var(--font-family-sans)" }}
      >

        {/* ── LEFT PANEL ── */}
        <div
          className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
          style={{
            background: "#f8f7ff",
            borderRight: "1px solid #e4e4e7",
          }}
        >
          {/* Subtle ambient glows */}
          <div style={{
            position: "absolute", top: "-20%", left: "-20%",
            width: "60%", height: "60%", borderRadius: "50%",
            background: "rgba(99,102,241,0.04)", filter: "blur(120px)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: "-10%", right: "-10%",
            width: "50%", height: "50%", borderRadius: "50%",
            background: "rgba(249,115,22,0.03)", filter: "blur(100px)",
            pointerEvents: "none",
          }} />

          {/* Dot-grid texture */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle, #88888820 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }} />

          {/* Logo — original */}
          <div className="flex items-center gap-3 relative z-10 sh-animate-fade-in">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <span className="font-bold text-lg lg:text-xl tracking-tight bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent truncate">
              ReviewRescue
            </span>
          </div>
          {/* Hero copy */}
          <div style={{ position: "relative", zIndex: 1, maxWidth: 440 }}>
            <h2
              className="sh-animate-fade-in"
              style={{
                fontSize: 38, fontWeight: 800, lineHeight: 1.15,
                letterSpacing: "-0.03em", color: "#0e0e1a",
                margin: "0 0 14px", animationDelay: "80ms",
              }}
            >
              Automate your hotel reputation management.
            </h2>

            <p
              className="sh-animate-fade-in"
              style={{
                fontSize: 15, color: "#71717a", lineHeight: 1.65,
                margin: "0 0 28px", animationDelay: "160ms",
              }}
            >
              Monitor reviews, generate AI responses, and resolve customer
              service issues across all platforms in real-time.
            </p>

            {/* Feature cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <FeatureCard
                icon={Star}
                title="AI Sentiment Analysis"
                description="Classify reviews and prioritize responses instantly."
                delay="240ms"
              />
              <FeatureCard
                icon={TrendingUp}
                title="Smart Resolution Workflows"
                description="Turn negative feedback into loyal guests automatically."
                delay="320ms"
              />
              <FeatureCard
                icon={Layers}
                title="Multi-Platform Sync"
                description="Pull from Google, Booking.com, Agoda & Airbnb automatically."
                delay="400ms"
              />
            </div>

            {/* Platform pills */}
            <div
              className="sh-animate-fade-in"
              style={{
                marginTop: 20, animationDelay: "480ms",
              }}
            >
              <p style={{
                fontSize: 11, fontWeight: 600, color: "#a1a1aa",
                textTransform: "uppercase", letterSpacing: "0.06em",
                margin: "0 0 8px",
              }}>
                Works with
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {platforms.map(p => (
                  <PlatformPill key={p.name} name={p.name} dot={p.dot} />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            position: "relative", zIndex: 1,
            borderTop: "1px solid #ece9f8",
            paddingTop: 16,
          }}>
            <span style={{ fontSize: 11, color: "#a1a1aa" }}>
              © 2026 ReviewRescue. All rights reserved.
            </span>
          </div>
        </div>

        {/* ── RIGHT PANEL — Login Form ── */}
        <div style={{
          display: "flex", flexDirection: "column",
          justifyContent: "center", alignItems: "center",
          padding: "48px 24px", background: "#ffffff",
          minHeight: "100vh",
        }}>

          {/* Mobile logo — original */}
          <div className="flex items-center gap-3 relative z-10 sh-animate-fade-in">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <span className="font-bold text-lg lg:text-xl tracking-tight bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent truncate">
              ReviewRescue
            </span>
          </div>

          {/* Card wrapper */}
          <br />
          <div className="login-card-enter w-full" style={{ maxWidth: 420 }}>

            {/* Welcome text — outside card */}
            <div style={{ marginBottom: 24 }}>
              {/* Small brand mark inside right panel */}


              <h1 style={{
                fontSize: 24, fontWeight: 700, color: "#09090b",
                margin: 0, letterSpacing: "-0.02em",
              }}>
                Welcome back
              </h1>
              <p style={{
                fontSize: 13, color: "#71717a", margin: "6px 0 0",
                lineHeight: 1.5,
              }}>
                Enter your credentials to access the reputation manager.
              </p>
            </div>

            {/* Card */}
            <div className="sh-card" style={{ padding: "32px 28px" }}>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                {/* Error alert */}
                {error && (
                  <div
                    role="alert"
                    className="sh-alert"
                    style={{
                      display: "flex", alignItems: "flex-start",
                      gap: 10, padding: "12px 14px",
                      background: "#fef2f2", border: "1px solid #fecaca",
                      borderRadius: 10, color: "#dc2626",
                      fontSize: 13, fontWeight: 500,
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    style={{
                      display: "block", fontSize: 13, fontWeight: 500,
                      color: "#3f3f46", marginBottom: 6,
                    }}
                  >
                    Email address
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      ref={emailRef}
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      placeholder="name@hotel.com"
                      onChange={e => { setError(""); setEmail(e.target.value); }}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      style={{ ...inputStyle(emailFocused), paddingRight: 16 }}
                    />
                    <Mail size={15} style={iconStyle} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    style={{
                      display: "block", fontSize: 13, fontWeight: 500,
                      color: "#3f3f46", marginBottom: 6,
                    }}
                  >
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      placeholder="••••••••"
                      onChange={e => { setError(""); setPassword(e.target.value); }}
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                      style={{ ...inputStyle(passFocused), paddingRight: 44 }}
                    />
                    <Lock size={15} style={iconStyle} />
                    <Tooltip content={showPassword ? "Hide password" : "Show password"} position="top">
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        style={{
                          position: "absolute", right: 12,
                          top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none",
                          padding: 4, cursor: "pointer",
                          color: "#a1a1aa", display: "flex",
                          alignItems: "center", borderRadius: 4,
                          transition: "color 150ms ease",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "#52525b"}
                        onMouseLeave={e => e.currentTarget.style.color = "#a1a1aa"}
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Submit */}
                <div style={{ paddingTop: 4 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8,
                      width: "100%", height: 50,
                      background: loading ? "#fdba74" : "#f97316",
                      border: "none", borderRadius: 10,
                      color: "#fff", fontSize: 14,
                      fontWeight: 600, letterSpacing: "0.01em",
                      cursor: loading ? "not-allowed" : "pointer",
                      transition: "all 150ms ease",
                      boxShadow: loading ? "none" : "0 2px 8px rgba(249,115,22,0.25)",
                    }}
                    onMouseEnter={e => {
                      if (!loading) {
                        e.currentTarget.style.background = "#ea580c";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px rgba(249,115,22,0.35)";
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = loading ? "#fdba74" : "#f97316";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = loading ? "none" : "0 2px 8px rgba(249,115,22,0.25)";
                    }}
                    onMouseDown={e => { e.currentTarget.style.transform = "scale(0.99)"; }}
                    onMouseUp={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                  >
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /><span>Signing in…</span></>
                      : "Sign In"
                    }
                  </button>
                </div>

              </form>
            </div>

            {/* Below-card note */}
            <p style={{
              marginTop: 20, textAlign: "center",
              fontSize: 12, color: "#a1a1aa", lineHeight: 1.6,
            }}>
              Having trouble?{" "}
              <span style={{ color: "#71717a", fontWeight: 500 }}>
                Contact your system administrator.
              </span>
            </p>
          </div>
        </div>

      </div>
    </>
  );
};

export default Login;