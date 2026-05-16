import Groq from "groq-sdk";

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

if (!apiKey) {
  console.error("[Groq] CRITICAL: VITE_GROQ_API_KEY is missing from environment variables!");
}

const groq = new Groq({
  apiKey: apiKey || "MISSING_KEY",
  dangerouslyAllowBrowser: true
});

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

    return chatCompletion.choices[0]?.message?.content?.trim() || "";
  } catch (e) {
    console.error("[Groq] Response generation failed:", e);
    return "";
  }
}
