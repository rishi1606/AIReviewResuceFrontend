import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  HelpCircle, X, ChevronDown,
  BarChart3, MessageSquare, Settings, Star, Flag, Shield,
  RefreshCw, CheckCircle2, AlertTriangle, Clock, Search,
  Bell, Sparkles, TrendingUp, Filter, Download, Eye,
  Users, BookOpen
} from "lucide-react";

// ─── Help content per page ──────────────────────────────────────────────────

const HELP_CONTENT = {
  dashboard: {
    title: "Your Dashboard — How It Works",
    intro: "This is your central overview — think of it as the front desk of your review management. Everything you need to know at a glance.",
    sections: [
      {
        icon: BarChart3,
        heading: "Understanding Your KPI Cards",
        items: [
          "**Total Reviews** — The total number of guest reviews collected from all the platforms you've connected (Google, Booking.com, Agoda, etc.). Gives you a quick sense of your review volume.",
          "**Avg Rating** — Your overall guest satisfaction score, shown on a 5-star scale. Even if a platform uses a 10-point scale (like Booking.com), it's automatically converted so you can compare across platforms easily.",
          "**Escalated** — Reviews that need your urgent attention. A review gets escalated when the guest gave a low rating (at or below the level you've chosen in Settings), or when the system detects it's high-urgency. You decide what counts as 'low'.",
          "**Positive Reviews** — The number of reviews where guests expressed satisfaction. Helps you quickly see how happy your guests are overall.",
          "**Why this matters** — These four numbers give you an instant health check of your hotel's online reputation without visiting each platform individually."
        ]
      },
      {
        icon: TrendingUp,
        heading: "Charts & Trends — Seeing the Big Picture",
        items: [
          "**Sentiment Trend** — A monthly chart showing how many reviews are Positive, Negative, Mixed, or Neutral over time. Use this to spot patterns — for example, if negative reviews spike during a particular month, it might point to a seasonal staffing issue.",
          "**Department Breakdown** — Shows which areas of your hotel guests mention most (Front Office, Housekeeping, F&B, etc.). This helps you direct improvements where they'll have the most impact.",
          "**Date Range Buttons** — Switch between 30 days, 1 month, or 5 months to zoom in or out on your trends.",
          "**Why this matters** — Numbers alone don't tell the full story. Trends help you understand whether things are getting better, worse, or staying flat — so you can take action before small problems become big ones."
        ]
      },
      {
        icon: MessageSquare,
        heading: "Recent Reviews Table",
        items: [
          "This table lists your most recent reviews from all platforms, showing the guest name, platform, rating, sentiment, status, and date.",
          "**Click any row** to open the full review and see the detailed analysis, draft a response, or take action.",
          "**VIEW ALL →** takes you to the full Reviews page where you can filter and search.",
          "**Why this matters** — Quickly scanning recent reviews lets you catch urgent issues (like a 1-star review from today) before they snowball into a reputation problem."
        ]
      },
      {
        icon: Filter,
        heading: "Filtering Your Data",
        items: [
          "**Property Filter** (in the sidebar) — If you manage multiple hotels, select a specific property to see only its reviews.",
          "**Platform Filter** (in the sidebar) — Focus on a single platform like Google or Booking.com.",
          "All KPI cards, charts, and the table update instantly when you change filters.",
          "**Why this matters** — Different properties and platforms may have very different guest profiles. Filtering lets you compare performance and prioritise where your attention is needed most."
        ]
      }
    ]
  },

  reviews: {
    title: "Guest Reviews — How It Works",
    intro: "This is where you see every guest review across all your connected platforms. Browse, filter, search, and take action — all from one place.",
    sections: [
      {
        icon: Filter,
        heading: "Filters & Sorting — Find What You Need",
        items: [
          "**Date Range** — Show reviews from All Time, Last 7 Days, Last 30 Days, or just Today. This helps you focus on what's recent and relevant.",
          "**Sentiment Tabs** — Quickly filter by Negative, Positive, Mixed, or Neutral reviews. Negative-first is often the best strategy so you can address unhappy guests quickly.",
          "**Department** — Filter by which department is mentioned (Front Office, Housekeeping, Management, etc.) so you can assign follow-ups to the right team.",
          "**Sort Order** — Sort by Newest first, Oldest first, or Lowest rating. Sorting by lowest rating is great for finding the most critical reviews fast.",
          "**Hide Low Confidence** — Toggle this on to hide reviews where the system wasn't fully confident in its analysis. These might need someone on your team to check manually.",
          "**Why this matters** — With dozens or hundreds of reviews, filters save you time by showing only what's relevant right now."
        ]
      },
      {
        icon: Eye,
        heading: "Understanding Review Cards",
        items: [
          "Each card shows the guest's name, which property and platform the review came from, their rating, a snippet of what they wrote, the detected sentiment, department, and urgency level.",
          "**Status Badges** — Look for coloured badges: **ESCALATED** (red) means urgent attention needed, **SUSPICIOUS** (amber) means something seems off, **RESPONDED** (green) means you've already approved a response, and **Classified** (grey) means it's been analysed but no action has been taken yet.",
          "**Click 'View Review →'** to open the full detail page where you can read the complete review, see the full analysis, draft a response, and approve or flag it.",
          "**Why this matters** — The card layout gives you a quick visual scan of your review landscape so you can prioritise which reviews to tackle first."
        ]
      },
      {
        icon: Download,
        heading: "Exporting Reviews",
        items: [
          "**CSV** — Download your filtered reviews as a spreadsheet file. Great for team meetings, reporting to ownership, or deeper analysis in Excel.",
          "**PDF** — Download a formatted report you can share with stakeholders or print for reference.",
          "Exports only include reviews matching your current filters — so you can export just negative reviews from last week, for example.",
          "**Why this matters** — Not everyone on your team uses ReviewRescue daily. Exports let you share insights with GMs, owners, or brand managers in a format they're comfortable with."
        ]
      },
      {
        icon: Search,
        heading: "Searching Reviews",
        items: [
          "Press **⌘K** (Mac) or **Ctrl+K** (Windows) to open the search bar, or click the search field in the top bar.",
          "You can search by guest name, review text, room number, platform, department, or even email address.",
          "**Click any search result** to go directly to that review's full detail page.",
          "**Why this matters** — When a guest calls to discuss their review, or when you need to find a specific complaint, search gets you there in seconds instead of scrolling through pages."
        ]
      }
    ]
  },

  reviewDetail: {
    title: "Review Detail — How It Works",
    intro: "This is the full view of a single guest review. Here you can see the complete analysis, draft a professional response, approve it, or flag the review for your team.",
    sections: [
      {
        icon: Sparkles,
        heading: "Smart Analysis — What the System Found",
        items: [
          "**Sentiment** — Whether the guest's overall tone is Positive, Negative, Mixed, or Neutral. This is detected automatically from the review text.",
          "**Department** — Which department the review is about (e.g., Front Office, Housekeeping, F&B). Helps you route follow-ups to the right team.",
          "**Urgency** — How quickly this review needs attention: Low, Medium, High, or Critical.",
          "**Guest Emotion** — The underlying feeling detected (e.g., frustrated, grateful, disappointed). This helps you choose the right tone when responding.",
          "**Confidence Score** — A percentage showing how sure the system is about its analysis. If it's below the level you've set in Settings, the review is marked for your team to check, because the system wasn't confident enough.",
          "**Issues & Positives** — Specific topics pulled from the review. For example: 'Slow check-in', 'Noisy room', or 'Excellent breakfast'.",
          "**Re-analyse** — If you think the analysis is wrong, click this to have the system re-read the review with fresh eyes and your latest settings.",
          "**Why this matters** — Instead of reading every review word-by-word yourself, the system highlights what's important so you can respond faster and more accurately."
        ]
      },
      {
        icon: MessageSquare,
        heading: "Drafting Your Response",
        items: [
          "**Generate Draft** — Click this to have the system write a professional response based on what the guest said and the tone you select.",
          "**Tone Selector** — Choose the voice of your response: **Formal** (professional and respectful), **Empathetic** (warm and understanding), **Friendly** (casual and approachable), **Apologetic** (for when things went wrong), or **Concise** (brief and to the point).",
          "**Edit** — Click the pencil icon to manually adjust the draft. You always have the final say on what gets sent.",
          "**Templates** — Use pre-saved response templates for common situations. You can create templates in Settings.",
          "**Character Count** — Shows how long your response is. Most platforms have character limits, so this helps you stay within bounds.",
          "**Why this matters** — Responding to reviews is one of the most impactful things you can do for your hotel's reputation. The system saves you time drafting, but you control the final message that guests will see."
        ]
      },
      {
        icon: CheckCircle2,
        heading: "Approval Workflow — Taking Action",
        items: [
          "**Approve** — Marks the review as 'Responded'. You need to generate or write a draft before you can approve. This is your sign-off that the response is ready to go.",
          "**Save Draft Only** — Saves your response without approving it. Useful if you want to come back later or have someone else review it first.",
          "**Reopen** — If you already approved a review but need to make changes, you can reopen it. A confirmation dialog will appear to prevent accidental clicks.",
          "**Audit Trail** — A complete history of everything that happened with this review: when it was analysed, who approved it, if it was flagged, reopened, etc. This is your paper trail for accountability.",
          "**Why this matters** — In a hotel environment, multiple people may handle reviews. The approval workflow ensures everyone knows who did what and when — no confusion, no finger-pointing."
        ]
      },
      {
        icon: Flag,
        heading: "Flagging & Removing Flags",
        items: [
          "**Flag this review** — Mark a review that seems suspicious, fake, or sensitive. Choose a category (Fake Review, Competitor Attack, Sensitive Content, etc.) and optionally assign it to a team member for follow-up.",
          "**Remove Flag** — If a review was flagged by mistake, you can remove the flag. The review goes back to its normal status.",
          "**Important**: Flagging a review does NOT prevent you from responding to it. It's simply a way to alert your team that something needs extra attention.",
          "**Why this matters** — Not all reviews are genuine. Some may be from competitors, disgruntled non-guests, or spam accounts. Flagging helps your team investigate without losing track of suspicious activity."
        ]
      },
      {
        icon: Shield,
        heading: "Keyword Alerts",
        items: [
          "If the review text contains any of the alert keywords you've set up in Settings, a warning banner appears at the top of the review.",
          "Common examples: words like 'cockroach', 'bed bugs', 'discrimination', or 'lawsuit' that signal potentially serious issues.",
          "**Why this matters** — Some words in reviews require immediate attention regardless of the star rating. A 4-star review mentioning 'mould' is still a health concern that needs follow-up."
        ]
      }
    ]
  },

  settings: {
    title: "Settings — How It Works",
    intro: "This is where you configure how the system behaves. Changes you make here affect how future reviews are handled and what gets flagged.",
    sections: [
      {
        icon: Sparkles,
        heading: "System Preferences",
        items: [
          "**Default Response Tone** — Sets the default voice for generated responses. You can always change the tone for individual reviews, but this saves you from selecting it every time.",
          "**Escalation Rating Level** — This is the star rating at or below which a review is automatically marked as 'Escalated' and needs urgent attention. For example, if you set it to 3, then any review rated 3 stars or lower (or 6/10 on Booking.com) will be flagged as urgent.",
          "**When does this take effect?** — The next time new reviews come in. Reviews that were already handled keep their existing status. If you want to re-evaluate an old review with the new setting, open it and click 'Re-analyse'.",
          "**Why this matters** — Different hotels have different standards. A boutique luxury hotel might escalate anything below 4 stars, while a budget hotel might only escalate 1-2 star reviews. You decide what 'urgent' means for your property."
        ]
      },
      {
        icon: AlertTriangle,
        heading: "Confidence Level",
        items: [
          "This is the minimum confidence percentage the system needs before its analysis is considered trustworthy.",
          "**Default is 75%**. If the system is less than 75% confident about a review's sentiment or department, it flags the review for your team to check manually.",
          "**Lower the level** if you're comfortable with the system's accuracy and want fewer manual reviews. **Raise it** if you prefer to double-check more reviews yourself.",
          "**When does this take effect?** — The next time new reviews come in. Already-handled reviews are not re-evaluated automatically.",
          "**Why this matters** — Some reviews are genuinely ambiguous (e.g., 'The room was fine, I guess'). The confidence level helps you decide how much human oversight you want — more automation or more manual control."
        ]
      },
      {
        icon: Bell,
        heading: "Keyword Alerts",
        items: [
          "Add specific words or phrases that should trigger an automatic alert when found in any review.",
          "When a review contains one of these keywords, it is **automatically flagged** and brought to your attention — regardless of the star rating.",
          "**Good keywords to add**: Health hazards (cockroach, mould, bed bugs), legal risks (discrimination, lawsuit, harassment), safety issues (fire, theft, injury), brand-damaging terms (worst hotel, never coming back, scam).",
          "**When does this take effect?** — The next time new reviews come in. Existing reviews won't be re-checked automatically unless you open them and click 'Re-analyse'.",
          "**Why this matters** — A 5-star review that mentions 'cockroach in the bathroom' is still a serious operational issue. Keywords catch these hidden problems that star ratings alone would miss."
        ]
      },
      {
        icon: MessageSquare,
        heading: "Response Templates",
        items: [
          "Create reusable response templates for situations you encounter frequently.",
          "For example, you might create templates for: 'Thank you for a positive review', 'Apology for housekeeping issue', 'Response to noise complaint'.",
          "Templates are available in the Review Detail page under the 'Templates' dropdown when drafting a response.",
          "**Why this matters** — Templates save time and ensure consistency. Your team can respond to common review types in seconds while maintaining your hotel's voice and standards."
        ]
      },
      {
        icon: Users,
        heading: "Properties & Team",
        items: [
          "**Properties** — Manage your connected hotels and the platforms linked to each one. You can activate or deactivate properties, and configure how often new reviews are collected.",
          "**Team Members** — Add or manage staff who have access to ReviewRescue. When flagging a review, you can assign it to a specific team member for follow-up.",
          "**Why this matters** — Multi-property management requires clear organisation. Each property can have different platforms, different schedules, and different team members responsible."
        ]
      },
      {
        icon: RefreshCw,
        heading: "When Do My Changes Take Effect?",
        items: [
          "**Escalation rating level** — Applies the next time new reviews come in. Already-handled reviews keep their current status.",
          "**Confidence level** — Same as above; only affects new incoming reviews.",
          "**Keyword alerts** — Same; new keywords will be checked against future reviews as they arrive.",
          "**Response tone** — Takes effect immediately the next time you generate a draft.",
          "**Templates** — Available immediately in the Review Detail page.",
          "**To re-evaluate old reviews** — Open the review and click 'Re-analyse'. This will re-check it using your current settings.",
          "**Why this matters** — We don't automatically re-check hundreds of old reviews when you change a setting, because that could change statuses and approvals your team has already acted on. You stay in control of what gets updated."
        ]
      }
    ]
  }
};

// ─── Accordion Item with smooth transition ─────────────────────────────────

const AccordionItem = ({ icon: Icon, heading, items, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [height, setHeight] = useState(defaultOpen ? "auto" : "0px");

  useEffect(() => {
    if (open) {
      const el = contentRef.current;
      if (el) {
        setHeight(`${el.scrollHeight}px`);
        const timer = setTimeout(() => setHeight("auto"), 300);
        return () => clearTimeout(timer);
      }
    } else {
      const el = contentRef.current;
      if (el) {
        setHeight(`${el.scrollHeight}px`);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setHeight("0px"));
        });
      }
    }
  }, [open]);

  return (
    <div className="border border-zinc-100 rounded-xl overflow-hidden mb-2 transition-shadow duration-200 hover:shadow-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-orange-50/40 transition-colors duration-200 cursor-pointer"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${open ? 'bg-orange-100' : 'bg-zinc-50'}`}>
          <Icon size={15} className={`transition-colors duration-200 ${open ? 'text-orange-500' : 'text-zinc-400'}`} />
        </div>
        <span className={`flex-1 text-[13px] font-bold transition-colors duration-200 ${open ? 'text-orange-600' : 'text-zinc-800'}`}>{heading}</span>
        <ChevronDown
          size={14}
          className={`text-zinc-400 transition-transform duration-300 ease-in-out ${open ? 'rotate-180' : 'rotate-0'}`}
        />
      </button>
      <div
        ref={contentRef}
        style={{ height, overflow: "hidden", transition: "height 300ms cubic-bezier(0.4, 0, 0.2, 1)" }}
      >
        <div className="px-4 pb-4 pt-1">
          <ul className="space-y-2.5 ml-11">
            {items.map((item, i) => (
              <li key={i} className="text-[12px] text-zinc-600 leading-relaxed flex items-start gap-2">
                <span className="text-orange-300 mt-0.5 shrink-0">•</span>
                <span dangerouslySetInnerHTML={{
                  __html: item
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-zinc-800 font-semibold">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em class="text-zinc-500 italic">$1</em>')
                }} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// ─── Main HelpModal ────────────────────────────────────────────────────────

const HelpModal = ({ page }) => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const modalRef = useRef(null);
  const content = HELP_CONTENT[page];

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 250);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!content) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2 py-1.5 text-zinc-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all duration-200 cursor-pointer"
        aria-label="Help"
        title="How does this page work?"
      >
        <HelpCircle size={16} />
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            backgroundColor: visible ? "rgba(15, 23, 42, 0.4)" : "rgba(15, 23, 42, 0)",
            backdropFilter: visible ? "blur(8px)" : "blur(0px)",
            WebkitBackdropFilter: visible ? "blur(8px)" : "blur(0px)",
            transition: "background-color 250ms ease, backdrop-filter 250ms ease",
          }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <div
            ref={modalRef}
            className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200"
            style={{
              maxHeight: "82vh",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
              transition: "opacity 250ms ease, transform 250ms ease",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100" style={{ background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shadow-sm">
                  <HelpCircle size={20} className="text-orange-500" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-zinc-900">{content.title}</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5 max-w-[340px] leading-snug">{content.intro}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all duration-200 cursor-pointer"
                aria-label="Close help"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(82vh - 85px)" }}>
              {content.sections.map((section, i) => (
                <AccordionItem
                  key={i}
                  icon={section.icon}
                  heading={section.heading}
                  items={section.items}
                  defaultOpen={i === 0}
                />
              ))}

              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-zinc-50 border border-orange-100/50">
                {/* <p className="text-[11px] text-zinc-500 flex items-center gap-2">
                  <BookOpen size={13} className="text-orange-400 shrink-0" />
                  <span>Need more help? Reach out to your ReviewRescue administrator or check the team documentation.</span>
                </p> */}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default HelpModal;
