import { useMemo } from "react";

export const dateFormat = (review) => {
    if (!review?.review_date) return "—";

    if (review.platform === "Google") {
        return review.review_date;
    }

    return new Date(review.review_date).toLocaleDateString();
};


// Parses both ISO dates AND Google-style relative strings
// e.g. "3 months ago", "2 days ago", "1 year ago", "a week ago"
export const parseReviewDate = (dateVal) => {
    if (!dateVal) return null;

    const strRaw = String(dateVal).trim();

    // ✅ FIX 1: Handle "Reviewed: May 21, 2026"
    if (strRaw.toLowerCase().startsWith("reviewed:")) {
        const cleaned = strRaw.replace(/reviewed:\s*/i, "");
        const d = new Date(cleaned);
        if (!isNaN(d)) return d;
    }

    // ✅ Try normal parsing (ISO, etc.)
    const direct = new Date(strRaw);
    if (!isNaN(direct)) return direct;

    // ✅ Handle relative strings
    const now = new Date();
    const str = strRaw.toLowerCase();

    const match = str.match(/^(?:(\d+)|a|an)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/);
    if (!match) return null;

    const amount = match[1] ? parseInt(match[1], 10) : 1;
    const unit = match[2];

    const result = new Date(now);

    switch (unit) {
        case "second": result.setSeconds(now.getSeconds() - amount); break;
        case "minute": result.setMinutes(now.getMinutes() - amount); break;
        case "hour": result.setHours(now.getHours() - amount); break;
        case "day": result.setDate(now.getDate() - amount); break;
        case "week": result.setDate(now.getDate() - amount * 7); break;
        case "month": result.setMonth(now.getMonth() - amount); break;
        case "year": result.setFullYear(now.getFullYear() - amount); break;
    }

    return result;
};

