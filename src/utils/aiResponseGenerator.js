import Groq from "groq-sdk";

const apiKey = import.meta.env.VITE_GROQ_DRAFT_API_KEY || import.meta.env.VITE_GROQ_API_KEY;

if (!apiKey) {
  console.error("[Groq] CRITICAL: Both VITE_GROQ_DRAFT_API_KEY and VITE_GROQ_API_KEY are missing from environment variables!");
}

const groq = new Groq({
  apiKey: apiKey || "MISSING_KEY",
  dangerouslyAllowBrowser: true
});

function generateFallbackResponse(review, tone, hotelConfig) {
  const hotel = review.hotel_name || hotelConfig?.hotel_name || "our hotel";
  const guest = review.reviewer_name || "Valued Guest";
  const rating = review.rating || 5;
  const issues = review.issues && review.issues.length > 0 ? review.issues.join(", ") : null;
  const versionId = Math.floor(Math.random() * 899 + 100);

  if (tone === "Formal") {
    if (rating >= 4) {
      return `Dear ${guest}, Thank you for taking the time to share your review of your stay at ${hotel}. We are pleased to note your high rating and appreciate your feedback. Our team remains committed to upholding exemplary hospitality standards, and we look forward to the privilege of welcoming you back on your next visit. Sincerely, Hotel Management (Ref: #${versionId})`;
    } else {
      return `Dear ${guest}, Thank you for your feedback regarding your stay at ${hotel}. We sincerely regret that certain aspects of your experience${issues ? ` regarding ${issues}` : ""} did not meet our customary high standards. Please be assured that we have shared your observations with our executive team for immediate review. We value your patronage and hope to have the opportunity to restore your confidence in our services. Sincerely, Hotel Management (Ref: #${versionId})`;
    }
  } else if (tone === "Empathetic") {
    if (rating >= 4) {
      return `Dear ${guest}, It brings us so much joy to read your kind review! Thank you for choosing ${hotel} and for sharing such positive ratings with us. We truly care about making every guest feel at home, and knowing you had a wonderful stay means the world to our team. We cannot wait to welcome you back again very soon! Warmly, The ${hotel} Team (Ref: #${versionId})`;
    } else {
      return `Dear ${guest}, We are deeply saddened to hear that your stay with us at ${hotel} fell short of your expectations${issues ? ` due to ${issues}` : ""}. We understand how frustrating and disappointing this must have been for you. Please accept our heartfelt apologies. Your comfort and peace of mind are our top priorities, and we are actively addressing your concerns with our team to ensure this never happens again. Warmest regards, Guest Relations Team (Ref: #${versionId})`;
    }
  } else if (tone === "Apologetic") {
    return `Dear ${guest}, Please accept our unreserved apologies for the inconveniences you experienced during your time at ${hotel}${issues ? ` concerning ${issues}` : ""}. We take full responsibility for these shortcomings, which are entirely unacceptable and do not reflect our standards. We are conducting an immediate internal review to rectify these issues. We deeply regret the frustration caused and hope you will allow us the chance to make things right in the future. Sincerely, Executive Management (Ref: #${versionId})`;
  } else if (tone === "Promotional") {
    if (rating >= 4) {
      return `Dear ${guest}, Thank you for your fantastic ${rating}-star review of ${hotel}! We are thrilled you enjoyed your experience with us. As a token of our appreciation, we would love to invite you back for an even more memorable stay. Please reach out to our reservations team on your next visit so we can arrange a special VIP upgrade for you! Best regards, The ${hotel} Team (Ref: #${versionId})`;
    } else {
      return `Dear ${guest}, Thank you for your review of ${hotel}. We regret that your stay was not flawless${issues ? ` due to ${issues}` : ""}. We are dedicated to providing exceptional hospitality and have taken swift action on your feedback. We would love the opportunity to welcome you back and demonstrate our true standards with an exclusive complimentary dining voucher or room upgrade on your next booking. Warm regards, Guest Services (Ref: #${versionId})`;
    }
  } else if (tone === "Escalation") {
    return `Dear ${guest}, Thank you for bringing this critical matter to our attention. We treat all feedback regarding ${hotel} with the utmost gravity, and the issues you raised${issues ? ` involving ${issues}` : ""} have been escalated directly to our General Manager for an urgent, thorough investigation. Please contact our executive office directly at gm@hotelrescue.com or +1-800-555-0199 so we can personally resolve this matter to your complete satisfaction. Respectfully, Executive Office of the GM (Ref: #${versionId})`;
  } else {
    return `Dear ${guest}, Thank you for sharing your review regarding your stay at ${hotel}. We value your feedback and are committed to continuously improving our guest experience. We hope to welcome you back soon. Best regards, Hotel Management (Ref: #${versionId})`;
  }
}

export async function generateResponse(review, tone, hotelConfig) {
  const toneInstructions = {
    Formal: "Write a professional, formal hotel management response. Use 'we' not 'I'.",
    Empathetic: "Write a warm, empathetic response that acknowledges the guest's feelings.",
    Apologetic: "Write a sincere apology-first response. Take full accountability.",
    Promotional: "Address the issue then pivot to invite the guest back with a warm offer.",
    Escalation: "Acknowledge the severity, name the GM, and provide a direct private channel."
  };

  try {
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `You are a senior hotel relations manager. ${toneInstructions[tone] || toneInstructions.Formal} Keep under 120 words. No subject lines.`
        },
        {
          role: "user",
          content: `Write a ${tone} response to:
Hotel: ${review.hotel_name || hotelConfig?.hotel_name}
Guest: ${review.reviewer_name}
Rating: ${review.rating}/5
Review: "${review.review_text}"
Issues: ${review.issues?.join(", ")}`
        }
      ]
    });

    const aiText = chatCompletion.choices[0]?.message?.content?.trim();
    if (aiText) return aiText;
    return generateFallbackResponse(review, tone, hotelConfig);
  } catch (e) {
    console.warn("[Groq] Response generation failed or rate limited, using fallback generator:", e.message || e);
    return generateFallbackResponse(review, tone, hotelConfig);
  }
}
