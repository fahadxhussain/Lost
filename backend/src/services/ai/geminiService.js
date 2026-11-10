const config = require('../../config');
const logger = require('../../shared/logger');

class GeminiService {
  constructor() {
    this.apiKey = config.gemini.apiKey;
    this.model = config.gemini.model;
  }

  /**
   * Evaluates a potential match between two shortlisted items.
   * AI is strictly advisory; it assesses likelihood and explains rationale.
   * It never claims or determines legal ownership.
   */
  async evaluateMatch(sourceReport, candidateReport) {
    // Determine which is lost and which is found
    const lostItem = sourceReport.type === 'LOST' ? sourceReport : candidateReport;
    const foundItem = sourceReport.type === 'FOUND' ? sourceReport : candidateReport;

    // If Gemini API key is not configured in environment, use an intelligent heuristic fallback for development
    if (!this.apiKey) {
      logger.warn('[GeminiService] GEMINI_API_KEY is not set. Using explainable heuristic fallback for dev.');
      return this.fallbackHeuristicEvaluation(lostItem, foundItem);
    }

    try {
      const prompt = `
You are an advisory assistant for a university Lost & Found office at COMSATS University Islamabad.
Evaluate whether the following LOST item and FOUND item likely describe the same physical object.

LOST ITEM:
- Title: ${lostItem.title}
- Description: ${lostItem.description}
- Category: ${lostItem.categoryName || 'Unknown'}
- Incident Location: ${lostItem.incidentLocation || 'Not specified'}
- Incident Date: ${lostItem.incidentDate ? new Date(lostItem.incidentDate).toDateString() : 'Unknown'}

FOUND ITEM:
- Title: ${foundItem.title}
- Description: ${foundItem.description}
- Category: ${foundItem.categoryName || 'Unknown'}
- Incident Location: ${foundItem.incidentLocation || 'Not specified'}
- Incident Date: ${foundItem.incidentDate ? new Date(foundItem.incidentDate).toDateString() : 'Unknown'}

INSTRUCTIONS:
1. Compare brand, color, model, specific damage/identifiers, and location context.
2. Return a strict JSON response with:
   - "score": a number from 0.0 (unrelated) to 1.0 (strong potential match).
   - "isMatch": boolean (true if score >= 0.65).
   - "reasoning": 1-2 concise sentences explaining what matches or differs.
3. Remember: You are advisory only. Never state with absolute certainty that someone owns an item.

OUTPUT JSON FORMAT ONLY:
{"score": 0.85, "isMatch": true, "reasoning": "Both describe a black 65W Dell Type-C laptop charger found in the library."}
`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(textOutput);

      return {
        score: Math.min(1.0, Math.max(0.0, parseFloat(parsed.score) || 0.0)),
        isMatch: Boolean(parsed.isMatch),
        reasoning: parsed.reasoning || 'AI identified possible physical feature similarities.',
      };
    } catch (err) {
      logger.error(`[GeminiService] Failed to evaluate match via Gemini API: ${err.message}`, err);
      // Fallback gracefully so worker does not stall
      return this.fallbackHeuristicEvaluation(lostItem, foundItem);
    }
  }

  fallbackHeuristicEvaluation(lostItem, foundItem) {
    const lostWords = new Set(
      `${lostItem.title} ${lostItem.description}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
    );
    const foundWords = new Set(
      `${foundItem.title} ${foundItem.description}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
    );

    let intersection = 0;
    for (const word of lostWords) {
      if (foundWords.has(word)) intersection++;
    }

    const union = new Set([...lostWords, ...foundWords]).size;
    const jaccard = union > 0 ? intersection / union : 0;
    const score = Math.min(0.95, Math.max(0.4, Number((0.5 + jaccard * 0.8).toFixed(2))));

    return {
      score,
      isMatch: score >= 0.55,
      reasoning: `Both items describe a ${lostItem.categoryName || 'reported item'} with overlapping details: "${Array.from(lostWords).filter((w) => foundWords.has(w)).slice(0, 4).join(', ')}".`,
    };
  }
}

module.exports = new GeminiService();
