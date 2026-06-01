import React, { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, Sparkles, Star, TrendingUp } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError("Invalid email or password");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate]);

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2 sh-grid-background font-sans text-zinc-900">

      {/* Left Pane - Branding & Premium Features Showcase (Visible on lg screens) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-50/50 text-zinc-900 relative overflow-hidden border-r border-zinc-200">
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/5 blur-[100px]" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }} />

        {/* Top Branding */}
        <div className="flex items-center gap-3 relative z-10 sh-animate-fade-in">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/30 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <span className="font-bold text-lg lg:text-xl tracking-tight bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent truncate">
            ReviewRescue
          </span>
        </div>

        {/* Dynamic Marketing Content */}
        <div className="my-auto relative z-10 max-w-lg sh-animate-scale-up">
          <h2
            className="text-4xl font-extrabold tracking-tight leading-tight mb-4 font-display text-indigo-950"
          >
            Automate your hotel reputation management.
          </h2>
          <p className="text-zinc-500 text-lg mb-8 leading-relaxed">
            Monitor reviews, generate AI responses, and resolve customer service issues across all platforms in real-time.
          </p>

          {/* Micro-animations / Feature list */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 bg-white/75 border border-zinc-200/80 rounded-2xl backdrop-blur-sm shadow-sm hover:border-zinc-300 transition-all duration-300">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <Star size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">AI Sentiment Analysis</p>
                <p className="text-xs text-zinc-500">Classify reviews and prioritize responses instantly.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-white/75 border border-zinc-200/80 rounded-2xl backdrop-blur-sm shadow-sm hover:border-zinc-300 transition-all duration-300">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">Smart Resolution Workflows</p>
                <p className="text-xs text-zinc-500">Turn negative feedback into loyal guests automatically.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-zinc-400 relative z-10 flex justify-between items-center">
          <span>© 2026 ReviewRescue. All rights reserved.</span>
        </div>
      </div>

      {/* Right Pane - The Login Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 md:p-20 relative min-h-screen">

        {/* Minimal top banner for mobile devices */}
        <div className="lg:hidden flex items-center gap-2 mb-8 sh-animate-fade-in">
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <ShieldCheck size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight font-display">
            ReviewRescue
          </span>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[420px] sh-animate-scale-up">

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 font-display">
              Welcome back
            </h1>
            <p className="text-sm text-zinc-500 mt-1.5">
              Enter your credentials to access the reputation manager.
            </p>
          </div>

          <div className="sh-card bg-white p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">

              {error && (
                <div role="alert" className="sh-alert flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="font-medium leading-snug">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Email Address
                </label>
                <div className="sh-input-wrapper">
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setError(""); setEmail(e.target.value); }}
                    className="sh-input"
                    placeholder="name@hotel.com"
                  />
                  <Mail className="sh-input-icon" size={16} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Password
                  </label>
                  {/* <a href="#" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                    Forgot password?
                  </a> */}
                </div>
                <div className="sh-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    autoComplete="current-password"
                    onChange={(e) => { setError(""); setPassword(e.target.value); }}

                    className="sh-input pr-12"
                    placeholder="••••••••"
                  />
                  <Lock className="sh-input-icon" size={16} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="sh-btn-brand py-3 font-semibold tracking-wide text-sm !bg-orange-500 hover:!bg-orange-600 !text-white !border-none relative overflow-hidden active:scale-[0.99] disabled:active:scale-100">
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin text-white" size={16} />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* <p className="text-xs text-center text-zinc-400 mt-8 leading-relaxed">
            Need support or custom integrations? <br />
            <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
              Contact our product team
            </a>
          </p> */}
        </div>
      </div>
    </div>
  );
};

export default Login;
