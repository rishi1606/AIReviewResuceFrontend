import Groq from "groq-sdk";
import { updateClassification, createTicket } from "../api/apiClient";
import { createTicketFromReview } from "./ticketFactory";

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

if (!apiKey) {
  console.error("[Groq-Classifier] CRITICAL: VITE_GROQ_API_KEY is missing!");
}

const groq = new Groq({
  apiKey: apiKey || "MISSING_KEY",
  dangerouslyAllowBrowser: true
});

export async function classifyReview(review, retryCount = 0) {
  console.log("[Groq] Classifying review_id:", review.review_id);

  try {
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an expert hotel operations analyst. Analyse guest hotel reviews and return structured JSON. Always respond with ONLY valid JSON."
        },
        {
          role: "user",
          content: `Analyse this hotel guest review:
Review text: "${review.review_text}"
Star rating: ${review.rating}
Platform: ${review.platform}
Guest name: ${review.reviewer_name}

Return ONLY this JSON shape:
{
  "sentiment": "Positive|Negative|Mixed|Neutral",
  "sentiment_reason": "",
  "confidence": 0-100,
  "departments": ["Housekeeping", "Maintenance", "F&B", "Front Office", "Security", "Concierge", "Spa", "Management"],
  "primary_department": "",
  "urgency": "High|Medium|Low|None",
  "urgency_reason": "",
  "issues": [],
  "positive_aspects": [],
  "requires_response": true,
  "response_priority": "Urgent|Normal|Optional",
  "suggested_action": "",
  "is_factual_only": false,
  "is_suspicious": false,
  "suspicious_reason": "",
  "guest_emotion": "Angry|Frustrated|Disappointed|Neutral|Satisfied|Delighted|Concerned|Anxious",
  "escalation_risk": false,
  "escalation_reason": ""
}`
        }
      ]
    });

    const raw = chatCompletion.choices[0]?.message?.content;
    const result = JSON.parse(raw);
    return result;
  } catch (e) {
    if (e.status === 429 || e.status === 400 || e.message?.includes("tokens") || e.message?.includes("rate limit")) {
      throw new Error("AI_TOKEN_LOW");
    }
    if (retryCount < 2) {
      console.warn(`[Groq] Retrying... (${retryCount + 1})`);
      await new Promise(res => setTimeout(res, 2000));
      return classifyReview(review, retryCount + 1);
    }
    console.error("[Groq] Classification failed after retries:", e);
    return null;
  }
}

export async function classifyAllPending(reviews, onProgress, dispatch, currentUser, staff, tickets = []) {
  const hotelConfigRaw = localStorage.getItem("rr_hotel_config");
  const hotelConfig = hotelConfigRaw ? JSON.parse(hotelConfigRaw) : {};
  const threshold = hotelConfig?.ai_confidence_threshold || 75;

  const isAutoTicketOn = hotelConfig?.aiConfig?.autoTicket;

  // 1. Identify reviews that need AI analysis
  const needsAI = reviews.filter(r => r.status === "Pending AI" || !r.status);

  // 2. Identify reviews that are already classified (have sentiment/urgency) but MISSING tickets
  const needsTicketOnly = isAutoTicketOn ? reviews.filter(r =>
    !r.linked_ticket_id &&
    r.sentiment &&
    (r.sentiment === "Negative" || r.sentiment === "Mixed" || r.urgency === "High" || r.urgency === "Medium")
  ) : [];

  console.log(`[AI] Deep Sync: ${needsAI.length} need AI, ${needsTicketOnly.length} need tickets only. Auto-Ticket: ${isAutoTicketOn}`);

  // --- PHASE A: Instant Ticket Creation for already classified reviews ---
  if (isAutoTicketOn) {
    for (const review of needsTicketOnly) {
      const ticketData = createTicketFromReview(review, review, hotelConfig);

      if (staff && staff.length > 0) {
        const deptStaff = staff.filter(s => s.department.toLowerCase() === (review.primary_department || "").toLowerCase());
        if (deptStaff.length > 0) {
          const assignee = deptStaff[0];
          ticketData.assignee_id = assignee._id;
          ticketData.assignee_name = assignee.name;
          ticketData.status = "In Progress";
        }
      }

      try {
        const created = await createTicket(ticketData);
        dispatch({ type: "CREATE_TICKET_FROM_REVIEW", payload: { review, classification: review, ticket: created.data } });
      } catch (err) {
        console.error("[AI] Instant ticket creation failed:", err);
      }
    }
  }

  // --- PHASE B: AI Analysis for pending reviews ---
  if (needsAI.length === 0) return;

  const batchSize = 3;
  let completed = 0;

  for (let i = 0; i < needsAI.length; i += batchSize) {
    const batch = needsAI.slice(i, i + batchSize);
    
    let results;
    try {
      results = await Promise.all(batch.map(r => classifyReview(r)));
    } catch (err) {
      if (err.message === "AI_TOKEN_LOW") {
        dispatch({ 
          type: "ADD_NOTIFICATION", 
          payload: { 
            message: "Ai analysis failed due to token low", 
            type: "sla_breach", // Uses the red icon
            urgency: "High",
            read: false 
          } 
        });
        return; // Stop processing further
      }
      throw err;
    }

    for (let idx = 0; idx < results.length; idx++) {
      const result = results[idx];
      const review = batch[idx];

      if (!result) continue;

      // Sanitize AI output to prevent backend validation errors
      const sanitizedResult = {
        ...result,
        issues: Array.isArray(result.issues) ? result.issues.filter(i => i && i !== "null") : [],
        positive_aspects: Array.isArray(result.positive_aspects) ? result.positive_aspects.filter(a => a && a !== "null") : [],
        departments: Array.isArray(result.departments) ? result.departments : []
      };

      const classificationPayload = {
        ...sanitizedResult,
        status: sanitizedResult.is_suspicious ? "Suspicious" : sanitizedResult.is_factual_only ? "No Action" : "Classified",
        needs_human_review: sanitizedResult.confidence < threshold,
        classified_at: Date.now()
      };

      await updateClassification(review.review_id, classificationPayload);
      dispatch({ type: "UPDATE_REVIEW_CLASSIFICATION", payload: { review_id: review.review_id, ...classificationPayload } });

      const shouldCreateTicket =
        result.sentiment === "Negative" ||
        result.sentiment === "Mixed" ||
        result.urgency === "High" ||
        result.urgency === "Medium";

      if (isAutoTicketOn && !result.is_suspicious && !result.is_factual_only && shouldCreateTicket) {
        const ticketData = createTicketFromReview(review, result, hotelConfig);

        // --- Smart Clustering Logic ---
        // Find existing tickets from the same guest or same major issue
        const similarTicket = tickets.find(t => 
          (t.guest_name === review.reviewer_name || 
           t.issues?.some(issue => result.issues?.includes(issue))) &&
          t.status !== "Closed"
        );

        if (similarTicket) {
          // If a ticket already exists, we DON'T create a new one.
          // Instead, we link this review to the existing ticket.
          await updateClassification(review.review_id, { linked_ticket_id: similarTicket.ticket_id });
          dispatch({ type: "LINK_REVIEW_TO_EXISTING_TICKET", payload: { review_id: review.review_id, ticket_id: similarTicket.ticket_id } });
          continue; // Skip creating a new ticket
        }

        if (staff && staff.length > 0) {
          const deptStaff = staff.filter(s => s.department.toLowerCase() === (result.primary_department || "").toLowerCase());
          if (deptStaff.length > 0) {
            const assignee = deptStaff[0];
            ticketData.assignee_id = assignee._id;
            ticketData.assignee_name = assignee.name;
            ticketData.status = "In Progress";
          }
        }

        try {
          const created = await createTicket(ticketData);
          dispatch({ type: "CREATE_TICKET_FROM_REVIEW", payload: { review, classification: result, ticket: created.data } });
          dispatch({ type: "ADD_NOTIFICATION", payload: { type: "new_ticket", message: `New ticket: ${review.reviewer_name} (${result.urgency})`, urgency: result.urgency, link_to: `/tickets?highlight=${ticketData.ticket_id}`, created_at: Date.now(), read: false } });
        } catch (err) {
          console.error("[AI] Ticket creation failed:", err);
        }
      }
    }

    completed += batch.length;
    if (onProgress) onProgress(completed, needsAI.length);
    if (i + batchSize < needsAI.length) await new Promise(r => setTimeout(r, 1000));
  }
}
