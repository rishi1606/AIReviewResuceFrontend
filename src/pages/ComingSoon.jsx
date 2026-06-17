import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2, Users, Bell, BarChart3, Lock, MessageSquare,
  Globe, Smartphone, Sparkles, Rocket, X, ShieldCheck
} from "lucide-react";

const FEATURES = [
  {
    icon: Building2,
    color: "#f97316",
    bg: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    title: "Multi-Hotel & Multi-Property",
    tag: "Major",
    description: "Manage your entire hotel group from one place — switch between hotels, compare performance, and generate brand-level reports.",
    details: [
      "Hotel Group Dashboard with all hotels at a glance",
      "Quick hotel switcher in the sidebar",
      "Cross-hotel performance comparison",
      "Individual settings per hotel",
      "Brand-level aggregate reporting",
    ]
  },
  {
    icon: Users,
    color: "#8b5cf6",
    bg: "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)",
    title: "Staff & Team Management",
    tag: "Major",
    description: "Add team members with roles like Manager, Staff, or Viewer. Assign reviews, track who did what, and collaborate with internal notes.",
    details: [
      "Role-based access — Owner, Manager, Staff, Viewer",
      "Invite team members via email link",
      "Assign reviews to specific team members",
      "Personal 'My Reviews' queue per staff",
      "Staff performance tracking & activity log",
    ]
  },
  {
    icon: Bell,
    color: "#ef4444",
    bg: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
    title: "Smart Notifications",
    tag: "Major",
    description: "Get notified outside the app — by email, phone, or Slack — when urgent reviews arrive or stay unanswered too long.",
    details: [
      "Email alerts for escalated reviews",
      "Daily/weekly email digest summaries",
      "Slack & Microsoft Teams integration",
      "Custom notification preferences",
      "SLA breach alerts for overdue reviews",
    ]
  },
  {
    icon: BarChart3,
    color: "#0ea5e9",
    bg: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
    title: "Reports & Analytics",
    tag: "Coming Soon",
    description: "Full reporting suite — monthly reports, satisfaction scores, word clouds, department insights, and competitor benchmarking.",
    details: [
      "Auto-generated monthly PDF reports",
      "Guest Satisfaction Score (composite metric)",
      "Response rate & time tracking",
      "Word cloud of review topics",
      "Competitor benchmarking",
    ]
  },
  {
    icon: Lock,
    color: "#64748b",
    bg: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
    title: "Security & Authentication",
    tag: "Comming Soon",
    description: "Enterprise-grade security with password recovery, two-factor authentication, Google SSO, and session management.",
    details: [
      "Forgot password / email reset flow",
      "Two-factor authentication (2FA)",
      "Google single sign-on (SSO)",
      "Session management & force logout",
      "Settings change audit log",
    ]
  },

  {
    icon: Globe,
    color: "#d946ef",
    bg: "linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)",
    title: "Language & Translation",
    tag: "Comming Soon",
    description: "Auto-detect review language, translate foreign reviews to English, and draft responses in the guest's own language.",
    details: [
      "Auto-detect review language",
      "Translate reviews to your preferred language",
      "Draft responses in the guest's language",
      "Multi-language app interface",
    ]
  },


];

const TAG_STYLES = {
  "Major": { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  "Coming Soon": { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  "Planned": { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  "Ongoing": { bg: "#ecfdf5", text: "#059669", border: "#a7f3d0" },
};

const ComingSoon = () => {
  const [selected, setSelected] = useState(null);
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => { setSelected(null); setClosing(false); }, 200);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-50 border border-orange-100 mb-4">
          <Rocket size={14} className="text-orange-500" />
          <span className="text-[12px] font-bold text-orange-600">Product Roadmap</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">
          What's Coming Next
        </h1>
        <p className="text-[14px] text-zinc-500 max-w-lg mx-auto leading-relaxed">
          We're building ReviewRescue into the most complete guest review
          platform for hotels. Here's what's on the way.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((f, i) => {
          const tag = TAG_STYLES[f.tag] || TAG_STYLES["Planned"];
          return (
            <button
              key={i}
              onClick={() => setSelected(f)}
              className="group text-left bg-white rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:shadow-xl p-5 transition-all duration-300 cursor-pointer relative overflow-hidden"
              style={{ animationDelay: `${i * 50}ms`, animation: "shSlideUp 400ms ease forwards", opacity: 0 }}
            >
              {/* Gradient glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ background: f.bg }}
              />

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ background: f.bg }}
                  >
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: tag.bg, color: tag.text, border: `1px solid ${tag.border}` }}
                  >
                    {f.tag}
                  </span>
                </div>

                <h3 className="text-[14px] font-bold text-zinc-900 mb-1.5 group-hover:text-zinc-800 transition-colors">
                  {f.title}
                </h3>
                <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">
                  {f.description}
                </p>

                <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Learn more</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {/* <div className="mt-10 text-center p-6 rounded-2xl bg-gradient-to-br from-orange-50 via-white to-purple-50 border border-zinc-100">
        <p className="text-[13px] text-zinc-600 font-medium">
          Have a feature request? Let us know what matters most to your team.
        </p>
        <p className="text-[11px] text-zinc-400 mt-1">
          Priorities are shaped by your feedback.
        </p>
      </div> */}

      {/* ── Detail Modal (Restricted) ── */}
      {selected && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            backgroundColor: closing ? "rgba(15,23,42,0)" : "rgba(15,23,42,0.4)",
            backdropFilter: closing ? "blur(0px)" : "blur(8px)",
            transition: "all 200ms ease",
          }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div
            className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200"
            style={{
              opacity: closing ? 0 : 1,
              transform: closing ? "translateY(20px) scale(0.97)" : "translateY(0) scale(1)",
              transition: "all 200ms ease",
            }}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-100" style={{ background: selected.bg }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/80 shadow-sm"
                  >
                    <selected.icon size={22} style={{ color: selected.color }} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-zinc-900">{selected.title}</h3>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5"
                      style={{
                        background: (TAG_STYLES[selected.tag] || TAG_STYLES["Planned"]).bg,
                        color: (TAG_STYLES[selected.tag] || TAG_STYLES["Planned"]).text,
                        border: `1px solid ${(TAG_STYLES[selected.tag] || TAG_STYLES["Planned"]).border}`,
                      }}
                    >
                      {selected.tag}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-white/60 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-[13px] text-zinc-600 leading-relaxed mb-4">
                {selected.description}
              </p>

              {/* Sub features list */}
              <div className="space-y-2 mb-5">
                {selected.details.map((d, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12px] text-zinc-600">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: selected.color, opacity: 0.6 }}
                    />
                    {d}
                  </div>
                ))}
              </div>

              {/* Restricted Banner */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-100 bg-amber-50">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-[12px] font-bold text-amber-800">This feature is not available yet</p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    It's on our roadmap and will be available in a future update. Stay tuned!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ComingSoon;
