import Papa from "papaparse";

export function parseCSV(file, existingReviews = []) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(validateRows(results.data, existingReviews)),
      error: reject
    });
  });
}

function validateRows(rows, existingReviews) {
  const valid = [];
  const errors = [];
  const duplicateIds = new Set();

  const existingIds = existingReviews?.map(r => r.review_id) || [];
  const existingPlatformIds = existingReviews?.map(r => r.platform_review_id).filter(Boolean) || [];

  rows.forEach((row, index) => {
    const rowErrors = [];

    if (!row.review_id) rowErrors.push("Missing review_id");
    if (duplicateIds.has(row.review_id)) rowErrors.push("Duplicate review_id in file");
    if (existingIds.includes(row.review_id)) rowErrors.push("Already imported");
    if (row.platform_review_id && existingPlatformIds.includes(row.platform_review_id)) rowErrors.push("Platform review already imported");
    if (!row.reviewer_name) rowErrors.push("Missing reviewer_name");
    if (!row.review_text || row.review_text.trim() === "") rowErrors.push("Missing review_text");
    if (!row.review_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.review_date)) rowErrors.push("review_date must be YYYY-MM-DD");

    const rating = parseInt(row.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) rowErrors.push("rating must be integer 1-5");

    const validPlatforms = ["Google", "Yelp", "TripAdvisor", "Booking.com", "Expedia"];
    if (!validPlatforms.includes(row.platform)) rowErrors.push("platform must be one of: " + validPlatforms.join(", "));

    duplicateIds.add(row.review_id);

    if (rowErrors.length === 0) {
      valid.push({ ...row, rating: parseInt(row.rating), status: "Pending AI", imported_at: Date.now() });
    } else {
      errors.push({ row: index + 2, data: row, errors: rowErrors });
    }
  });

  return {
    valid,
    errors,
    totalRows: rows.length,
    validCount: valid.length,
    errorCount: errors.length,
    duplicateCount: errors.filter(e => e.errors.some(err => err.includes("Already imported") || err.includes("Duplicate"))).length
  };
}

export function generateCSVTemplate() {
  const headers = ["review_id", "reviewer_name", "rating", "review_text", "review_date", "stay_date", "platform", "platform_review_id", "room_number", "guest_email", "photo_urls", "reviewer_language", "loyalty_tier", "hotel_name"];
  const example1 = ["rev001", "John Smith", "2", "The room was not clean and the AC was broken.", "2024-05-01", "2024-04-30", "Google", "google_abc123", "302", "john@example.com", "", "en", "Gold", "The Grand Hotel"];
  const example2 = ["rev002", "Sarah Johnson", "5", "Incredible stay! Staff were amazing and room was spotless.", "2024-05-02", "2024-05-01", "TripAdvisor", "ta_xyz789", "101", "sarah@example.com", "", "en", "None", "The Grand Hotel"];
  const csv = [headers, example1, example2].map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reviewrescue_template.csv";
  a.click();
}
