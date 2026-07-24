const { GoogleGenerativeAI } = require("@google/generative-ai");
const { STAGES } = require("../models/Application");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Takes raw recruiter email text and returns a structured extraction:
 * { company, stageDetected, summary, suggestedFollowUpDate, isRejection }
 * Falls back gracefully if Gemini output isn't clean JSON.
 */
async function parseRecruiterEmail(rawText) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a job-search assistant. Read the recruiter email below and return ONLY a JSON object (no markdown, no backticks, no preamble) with these exact keys:

{
  "company": string or null,
  "stageDetected": one of ${JSON.stringify(STAGES)} or null,
  "summary": a 1-2 sentence plain-English summary of what this email means for the candidate,
  "suggestedFollowUpDate": an ISO date string (YYYY-MM-DD) if the email mentions a next step date/deadline, else null,
  "isRejection": boolean
}

Email:
"""
${rawText}
"""`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  const cleaned = responseText.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    return {
      company: null,
      stageDetected: null,
      summary: responseText.slice(0, 300),
      suggestedFollowUpDate: null,
      isRejection: /unfortunately|not moving forward|other candidates/i.test(rawText),
    };
  }
}

module.exports = { parseRecruiterEmail };