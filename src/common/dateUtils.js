import { useMemo } from "react";

export const dateFormat = (review) => {
    if (!review?.review_date) return "—";

    if (review.platform === "Google") {
        return review.review_date;
    }

    return new Date(review.review_date).toLocaleDateString();
};