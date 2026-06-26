// ─── Topic dictionary for "What Guests Talk About" ───────────────────────────
// Shared by the Dashboard (to count mentions) and the Reviews page (to filter
// to the exact same set when a topic is clicked). Each topic maps to the words
// guests actually use; `pattern` is a word-boundary regex string reused on both
// the client (counting) and the server (filtering) so the numbers always match.
import {
  Wifi, Coffee, MapPin, Sparkles, Users, BedDouble, ShowerHead,
  UtensilsCrossed, Waves, Car, Volume2, Snowflake, Wallet, KeyRound, Mountain,
} from "lucide-react";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Build the shared word-boundary regex source from a list of synonyms.
export const buildTopicPattern = (words) =>
  `\\b(?:${words.map(escapeRe).join("|")})\\b`;

// accent: tile classes (icon chip) for the snapshot bars, color (hex) for the
// trend chart lines / legend dots — same identity colour in both views.
const RAW_TOPICS = [
  { key: "wifi",        label: "WiFi",             icon: Wifi,            color: "#3b82f6", tile: "bg-blue-50 text-blue-600 border-blue-100",       words: ["wifi", "wi-fi", "internet", "connection", "network"] },
  { key: "breakfast",   label: "Breakfast",        icon: Coffee,          color: "#f59e0b", tile: "bg-amber-50 text-amber-600 border-amber-100",    words: ["breakfast", "buffet", "morning meal"] },
  { key: "location",    label: "Location",         icon: MapPin,          color: "#f97316", tile: "bg-orange-50 text-orange-600 border-orange-100", words: ["location", "located", "central", "centrally", "neighbourhood", "neighborhood", "walking distance", "close to"] },
  { key: "clean",       label: "Cleanliness",      icon: Sparkles,        color: "#06b6d4", tile: "bg-cyan-50 text-cyan-600 border-cyan-100",       words: ["clean", "cleanliness", "dirty", "spotless", "dust", "dusty", "hygiene", "hygienic", "stain", "stained"] },
  { key: "staff",       label: "Staff",            icon: Users,           color: "#a855f7", tile: "bg-purple-50 text-purple-600 border-purple-100", words: ["staff", "reception", "receptionist", "front desk", "concierge", "manager", "host", "employee", "courteous", "friendly"] },
  { key: "room",        label: "Room",             icon: BedDouble,       color: "#6366f1", tile: "bg-indigo-50 text-indigo-600 border-indigo-100", words: ["room", "suite", "bed", "bedroom", "mattress", "pillow"] },
  { key: "bathroom",    label: "Bathroom",         icon: ShowerHead,      color: "#14b8a6", tile: "bg-teal-50 text-teal-600 border-teal-100",       words: ["bathroom", "shower", "toilet", "washroom", "tub"] },
  { key: "food",        label: "Food",             icon: UtensilsCrossed, color: "#f43f5e", tile: "bg-rose-50 text-rose-600 border-rose-100",       words: ["food", "restaurant", "dinner", "lunch", "meal", "dining", "menu", "delicious", "tasty"] },
  { key: "pool",        label: "Pool",             icon: Waves,           color: "#0ea5e9", tile: "bg-sky-50 text-sky-600 border-sky-100",          words: ["pool", "swimming"] },
  { key: "parking",     label: "Parking",          icon: Car,             color: "#64748b", tile: "bg-slate-100 text-slate-600 border-slate-200",   words: ["parking", "car park", "valet"] },
  { key: "noise",       label: "Noise",            icon: Volume2,         color: "#eab308", tile: "bg-yellow-50 text-yellow-700 border-yellow-100", words: ["noise", "noisy", "loud", "quiet", "soundproof"] },
  { key: "ac",          label: "Air Conditioning", icon: Snowflake,       color: "#0284c7", tile: "bg-sky-50 text-sky-700 border-sky-100",          words: ["air conditioning", "a/c", "aircon", "heater", "heating", "temperature"] },
  { key: "value",       label: "Value",            icon: Wallet,          color: "#10b981", tile: "bg-emerald-50 text-emerald-600 border-emerald-100", words: ["value", "price", "pricey", "expensive", "cheap", "worth", "overpriced", "affordable"] },
  { key: "checkin",     label: "Check-in",         icon: KeyRound,        color: "#8b5cf6", tile: "bg-violet-50 text-violet-600 border-violet-100", words: ["check-in", "check in", "checkin", "check-out", "check out", "checkout"] },
  { key: "view",        label: "View",             icon: Mountain,        color: "#d946ef", tile: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100", words: ["view", "scenery", "overlooking", "panoramic"] },
];

export const TOPIC_DEFS = RAW_TOPICS.map((t) => {
  const pattern = buildTopicPattern(t.words);
  return { ...t, pattern, re: new RegExp(pattern, "i") };
});

export const getTopicByKey = (key) => TOPIC_DEFS.find((t) => t.key === key);

// Which topics a single review mentions (text + AI highlights). Shared so the
// snapshot bars and the monthly trend chart count mentions identically.
export const matchReviewTopics = (review) => {
  const text = review.review_text ?? "";
  const issues = Array.isArray(review.issues) ? review.issues.join(" • ") : "";
  const positives = Array.isArray(review.positive_aspects) ? review.positive_aspects.join(" • ") : "";
  return TOPIC_DEFS.filter((t) => t.re.test(text) || t.re.test(issues) || t.re.test(positives));
};

// Aggregate topic mentions across reviews, splitting each by sentiment.
// One mention counted per review per topic. Per-topic sentiment is inferred
// from the AI issues/positive_aspects arrays, falling back to the review's
// overall sentiment when the keyword isn't isolated to one of them.
export const deriveTopics = (reviews) => {
  const acc = TOPIC_DEFS.map((t) => ({
    key: t.key, label: t.label, icon: t.icon, tile: t.tile, color: t.color,
    total: 0, pos: 0, neg: 0, neu: 0,
  }));

  reviews.forEach((r) => {
    const text = r.review_text ?? "";
    const issues = Array.isArray(r.issues) ? r.issues.join(" • ") : "";
    const positives = Array.isArray(r.positive_aspects) ? r.positive_aspects.join(" • ") : "";
    const overall = r.sentiment;

    TOPIC_DEFS.forEach((t, i) => {
      const inIssues = t.re.test(issues);
      const inPositives = t.re.test(positives);
      const inText = t.re.test(text);
      if (!inIssues && !inPositives && !inText) return;

      acc[i].total++;
      if (inIssues && !inPositives) acc[i].neg++;
      else if (inPositives && !inIssues) acc[i].pos++;
      else if (overall === "Positive") acc[i].pos++;
      else if (overall === "Negative") acc[i].neg++;
      else acc[i].neu++;
    });
  });

  return acc.filter((t) => t.total > 0).sort((a, b) => b.total - a.total);
};
